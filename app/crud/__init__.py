# app/crud/__init__.py

# Импортируем старые модули, которые все еще используются
from . import crud_user as user
from . import crud_playlist as playlist

# ИСПРАВЛЕНИЕ: Импортируем новый единый модуль для всей музыкальной логики
from . import crud_music as music