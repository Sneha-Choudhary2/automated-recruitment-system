from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class JobCreate(BaseModel):
    title: str
    raw_text: str
    application_deadline: Optional[datetime] = None