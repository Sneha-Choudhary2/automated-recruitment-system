from app.db.session import SessionLocal
from app.db.models.user import User
from app.core.security import hash_password

db = SessionLocal()

email = "admin@ats.com"
password = "admin123"   # change later
role = "admin"

existing = db.query(User).filter(User.email == email).first()

if existing:
    print("Admin user already exists.")
else:
    user = User(
        email=email,
        hashed_password=hash_password(password),
        role=role,
        is_active=True
    )
    db.add(user)
    db.commit()
    print("Admin user created successfully.")

db.close()

