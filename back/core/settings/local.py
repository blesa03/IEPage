from .base import *

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'iepage_db'),
        'USER': os.getenv('DB_USER', 'varo12ff'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'root'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'OPTIONS': {"sslmode": "prefer"},
    }
}

FRONT_ORIGIN = os.getenv("FRONT_ORIGIN", "http://localhost:5173")

CORS_ALLOWED_ORIGINS = [FRONT_ORIGIN]
CSRF_TRUSTED_ORIGINS = [FRONT_ORIGIN]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = list(default_headers) + ["X-CSRFToken", "Authorization", "Content-Type"]
CORS_ALLOW_METHODS = list(default_methods)

SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_HTTPONLY = False
SECURE_PROXY_SSL_HEADER = None
