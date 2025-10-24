import os

DJANGO_ENV = os.getenv("DJANGO_ENV", "local")

if DJANGO_ENV == "production":
    from .production import *
else:
    from .local import *
