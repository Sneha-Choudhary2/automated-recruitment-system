from app.db.session import SessionLocal
from app.db.models.user import User
from app.core.security import hash_password

db = SessionLocal()

email = "admin@ats.com"
password = "admin123"

user = db.query(User).filter(User.email == email).first()

if user:
    user.hashed_password = hash_password(password)
    print("Admin password reset successfully.")
else:
    user = User(
        email=email,
        hashed_password=hash_password(password),
        role="admin",
        is_active=True
    )
    db.add(user)
    print("Admin user created successfully.")

db.commit()
db.close()
