from django.urls import path
from .views import view_clasification 

urlpatterns = [
    path('<int:league_id>/', view_clasification, name='view_clasification'),
]
