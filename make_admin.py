from app.db.session import SessionLocal
from app.models.user import User

def make_user_admin(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"❌ Пользователь {email} не найден!")
            return

        user.is_admin = True
        db.commit()
        print(f"✅ Успешно! Пользователь {email} теперь АДМИНИСТРАТОР.")
        print("Теперь выйди из системы и войди снова, чтобы обновить токен.")
    except Exception as e:
        print(f"Ошибка: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # Вставь сюда свой email
    make_user_admin("ngroshev2021@yandex.ru")