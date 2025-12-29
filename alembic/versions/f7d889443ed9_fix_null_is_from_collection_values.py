"""fix null is_from_collection values

Revision ID: <ваш_id_тут>
Revises: <предыдущий_id>
Create Date: ...

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f7d889443ed9'
down_revision = '6677a44e15d9'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Сначала исправляем данные: меняем все NULL на 0 (False)
    op.execute("UPDATE playlists SET is_from_collection = 0 WHERE is_from_collection IS NULL")

    # 2. Теперь, когда данных NULL нет, можно сделать колонку обязательной (NOT NULL)
    # Используем batch_alter_table, так как SQLite не поддерживает обычный ALTER COLUMN
    with op.batch_alter_table('playlists') as batch_op:
        batch_op.alter_column('is_from_collection',
                              existing_type=sa.Boolean(),
                              nullable=False,
                              server_default='0')


def downgrade():
    # Если откатываем миграцию, разрешаем снова сохранять NULL
    with op.batch_alter_table('playlists') as batch_op:
        batch_op.alter_column('is_from_collection',
                              existing_type=sa.Boolean(),
                              nullable=True,
                              server_default=None)