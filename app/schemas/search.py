from pydantic import BaseModel
from typing import List
from .music import Composer, WorkWithComposer, Recording

class SearchResults(BaseModel):
    query: str
    composers: List[Composer] = []
    works: List[WorkWithComposer] = []
    recordings: List[Recording] = []