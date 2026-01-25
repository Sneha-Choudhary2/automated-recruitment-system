from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class JobCreate(BaseModel):
    title: str
    raw_text: str
    application_deadline: Optional[datetime] = None
