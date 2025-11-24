from pydantic import BaseModel
from typing import List
from .music import Composer, WorkWithComposer, Recording, Composition


class SearchResults(BaseModel):
    query: str
    composers: List[Composer] = []
    works: List[WorkWithComposer] = []
    compositions: List[Composition] = []
    recordings: List[Recording] = []

    # ДОБАВЛЕНО:
    class Config:
        from_attributes = True