from django.test import TestCase, Client
from django.urls import reverse
from decimal import Decimal
import json

from market.models import TransferOffer, TransferProcess
from market.types import TransferOfferStatus, TransferProcessStatus
from draft.models import Draft
from team.models import Team
from users.models import DraftUser
from players.models import Player, DraftPlayer
from users.models import User
from league.models import League


class MarketViewsTests(TestCase):
    def setUp(self):
        self.client = Client()

        # --- Usuarios ---
        self.user1 = User.objects.create_user(username="user1", password="12345")
        self.user2 = User.objects.create_user(username="user2", password="12345")
        self.client.login(username="user1", password="12345")

        self.league = League.objects.create(name="Liga Test")
        
        # --- Draft ---
        self.draft = Draft.objects.create(
            league=self.league,  # puedes ajustar si usas un League real o mock
            name="Liga Test",
        )

        # --- DraftUsers ---
        self.draft_user1 = DraftUser.objects.create(user=self.user1, draft=self.draft, order=1)
        self.draft_user2 = DraftUser.objects.create(user=self.user2, draft=self.draft, order=2)

        # --- Equipos ---
        self.team1 = Team.objects.create(
            name="Equipo 1", draft=self.draft, draft_user=self.draft_user1, budget=Decimal("1000.00"), points=0
        )
        self.team2 = Team.objects.create(
            name="Equipo 2", draft=self.draft, draft_user=self.draft_user2, budget=Decimal("1000.00"), points=0
        )

        # --- Jugadores ---
        self.player = Player.objects.create(
            name="Jugador Test",
            gender="M",
            position="FW",
            element="FIRE",
            value=Decimal("500.00")
        )
        self.draft_player = DraftPlayer.objects.create(
            player=self.player,
            team=self.team2,
            name="Jugador Draft Test",
            draft=self.draft,
            release_clause=Decimal("600.00")
        )

        # --- Proceso y Oferta inicial ---
        self.transfer_process = TransferProcess.objects.create(
            draft_player=self.draft_player,
            offering_team=self.team1,
            target_team=self.team2,
            amount=Decimal("500.00")
        )
        self.transfer_offer = TransferOffer.objects.create(
            transfer_process=self.transfer_process,
            offering_team=self.team1,
            target_team=self.team2,
            offer=Decimal("500.00"),
            draft_player=self.draft_player
        )

    # -------------------------------------------------------------------------
    # view_player_offers
    # -------------------------------------------------------------------------
    def test_view_player_offers_ok(self):
        url = reverse("view_player_offers", args=[self.draft_player.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(isinstance(data, list))
        self.assertGreaterEqual(len(data), 1)

    def test_view_player_offers_wrong_method(self):
        url = reverse("view_player_offers", args=[self.draft_player.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, 405)

    # -------------------------------------------------------------------------
    # view_offer
    # -------------------------------------------------------------------------
    def test_view_offer_ok(self):
        url = reverse("view_offer", args=[self.transfer_offer.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn("offer", response.json())

    def test_view_offer_not_found(self):
        url = reverse("view_offer", args=[9999])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

    # -------------------------------------------------------------------------
    # send_offer
    # -------------------------------------------------------------------------
    def test_send_offer_ok(self):
        # Crear un nuevo jugador que no tenga ninguna negociación abierta
        new_player = Player.objects.create(
            name="Jugador Nuevo",
            gender="M",
            position="FW",
            element="FIRE",
            value=500
        )

        new_draft_player = DraftPlayer.objects.create(
            player=new_player,
            team=self.team2,  # mismo equipo destino
            name="Jugador Nuevo Draft",
            draft=self.draft,
            release_clause=600
        )

        url = reverse("send_offer")
        data = {"offer": 1000, "draft_player_id": new_draft_player.id}

        response = self.client.post(url, json.dumps(data), content_type="application/json")

        self.assertIn(
            response.status_code,
            [200, 201],
            msg=f"Unexpected status {response.status_code}. Response:\n{response.content.decode()}"
        )

        # Verificamos que se haya creado una oferta nueva para el nuevo jugador
        self.assertTrue(
            TransferOffer.objects.filter(draft_player=new_draft_player).exists(),
            msg="No se creó la oferta para el nuevo jugador."
        )
        
        new_offer = TransferOffer.objects.get(draft_player=new_draft_player)
        
        self.assertTrue(new_offer.transfer_process != self.transfer_process, msg='La oferta no se ha creado correctamente')
        self.assertTrue(new_offer.draft_player == new_draft_player, msg='La oferta no se ha creado correctamente')
        self.assertTrue(new_offer.offer == 1000, msg='La oferta no se ha creado correctamente')
        self.assertTrue(new_offer.transfer_process.amount == 1000, msg='La oferta no se ha creado correctamente')
        self.assertTrue(new_offer.transfer_process.draft_player == new_draft_player, msg='La oferta no se ha creado correctamente')

        
        
    def test_send_offer_missing_parameters(self):
        url = reverse("send_offer")
        response = self.client.post(url, json.dumps({}), content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_send_offer_player_not_found(self):
        url = reverse("send_offer")
        data = {"offer": 600, "draft_player_id": 9999}
        response = self.client.post(url, json.dumps(data), content_type="application/json")
        self.assertEqual(response.status_code, 404)
    
    def test_send_offer_team_owner(self):
        new_player = Player.objects.create(
            name="Jugador Test",
            gender="M",
            position="FW",
            element="FIRE",
            value=Decimal("500.00")
        )
        new_draft_player = DraftPlayer.objects.create(
            player=new_player,
            team=self.team1,
            name="Jugador Draft Test",
            draft=self.draft,
            release_clause=Decimal("600.00")
        )
        
        url = reverse("send_offer")
        data = {"offer": 600, "draft_player_id": new_draft_player.id}
        response = self.client.post(url, json.dumps(data), content_type="application/json")
        self.assertEqual(response.status_code, 409)

    # -------------------------------------------------------------------------
    # accept_offer
    # -------------------------------------------------------------------------
    def test_accept_offer_ok(self):
        url = reverse("accept_offer", args=[self.transfer_offer.id])
        self.transfer_offer.status = TransferOfferStatus.PENDING
        self.transfer_offer.save()
        response = self.client.patch(url)
        self.assertIn(response.status_code, [200, 204])
        self.transfer_offer.refresh_from_db()
        self.assertEqual(self.transfer_offer.status, TransferOfferStatus.ACEPTED)

    def test_accept_offer_not_found(self):
        url = reverse("accept_offer", args=[9999])
        response = self.client.patch(url)
        self.assertEqual(response.status_code, 404)

    def test_accept_offer_wrong_method(self):
        url = reverse("accept_offer", args=[self.transfer_offer.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 405)

    # -------------------------------------------------------------------------
    # reject_offer
    # -------------------------------------------------------------------------
    def test_reject_offer_ok(self):
        url = reverse("reject_offer", args=[self.transfer_offer.id])
        self.transfer_offer.status = TransferOfferStatus.PENDING
        self.transfer_offer.save()
        response = self.client.patch(url)
        self.assertIn(response.status_code, [200, 204])
        self.transfer_offer.refresh_from_db()
        self.assertEqual(self.transfer_offer.status, TransferOfferStatus.REJECTED)

    def test_reject_offer_not_found(self):
        url = reverse("reject_offer", args=[9999])
        response = self.client.patch(url)
        self.assertEqual(response.status_code, 404)

    # -------------------------------------------------------------------------
    # counter_offer
    # -------------------------------------------------------------------------
    def test_counter_offer_ok(self):
        url = reverse("counter_offer", args=[self.transfer_offer.id])
        data = {"offer": 650}
        response = self.client.post(url, json.dumps(data), content_type="application/json")
        self.assertIn(response.status_code, [200, 201], response.content.decode())
        # Debe existir una segunda oferta asociada al mismo proceso
        offers_count = TransferOffer.objects.filter(transfer_process=self.transfer_process).count()
        self.assertEqual(offers_count, 2)

    def test_counter_offer_missing_params(self):
        url = reverse("counter_offer", args=[self.transfer_offer.id])
        response = self.client.post(url, json.dumps({}), content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_counter_offer_not_found(self):
        url = reverse("counter_offer", args=[9999])
        data = {"offer": 700}
        response = self.client.post(url, json.dumps(data), content_type="application/json")
        self.assertEqual(response.status_code, 404)
