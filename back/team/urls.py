from django.urls import path
from .views import my_team 

urlpatterns = [
    path('<int:draft_id>/', my_team, name='my_team'),
]
