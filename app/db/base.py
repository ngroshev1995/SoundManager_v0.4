from sqlalchemy import Table, Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class PlaylistRecording(Base):
    __tablename__ = 'playlist_recording'
    playlist_id = Column(Integer, ForeignKey('playlists.id'), primary_key=True)
    recording_id = Column(Integer, ForeignKey('recordings.id'), primary_key=True)
    recording_order = Column(Integer, nullable=False)

    playlist = relationship("Playlist", back_populates="recording_associations")
    recording = relationship("Recording", back_populates="playlist_associations")


recording_favorites_association = Table(
    'recording_favorites', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('recording_id', Integer, ForeignKey('recordings.id'), primary_key=True)
)