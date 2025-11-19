# app/schemas/__init__.py

from .user import User, UserCreate, UserUpdate
from .music import (
    Composer, ComposerCreate, ComposerUpdate, ComposerSimple,
    Work, WorkCreate, WorkUpdate, WorkWithComposer,
    Composition, CompositionCreate, CompositionUpdate, CompositionSimple,
    Recording, RecordingCreate, RecordingUpdate, RecordingPage,
    BulkRecordingRequest, FullRecordingDetailsUpdate
)
from .playlist import Playlist, PlaylistCreate, PlaylistUpdate
from .token import Token, TokenData
from .dashboard import DashboardSummary, DashboardStats
from . import search # <-- ДОБАВИТЬ ЭТУ СТРОКУ