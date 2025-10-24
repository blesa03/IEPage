from .base import *

DEBUG = os.getenv("DEBUG", "false").lower() == "true"
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "*").split(",")

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'OPTIONS': {"sslmode": os.getenv("DB_SSLMODE", "require")},
    }
}

CORS_ALLOWED_ORIGINS = [
    os.getenv("FRONT_ORIGIN", "http://localhost:5173"),
]
CORS_ALLOWED_ORIGIN_REGEXES = [
    "https://ie-page.vercel.app",
]
CSRF_TRUSTED_ORIGINS = [
    os.getenv("FRONT_ORIGIN", "http://localhost:5173"),
    "https://ie-page.vercel.app",
    "https://iepage-1.onrender.com",
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = list(default_headers) + ["X-CSRFToken", "Authorization", "Content-Type"]
CORS_ALLOW_METHODS = list(default_methods)

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = "None"
CSRF_COOKIE_SAMESITE = "None"
CSRF_COOKIE_HTTPONLY = False
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
