"""fix nulls

Revision ID: 6c0cbc2f34cd
Revises: b98483270a6e
Create Date: 2025-12-29 08:47:34.925816

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6c0cbc2f34cd'
down_revision: Union[str, Sequence[str], None] = 'b98483270a6e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Сначала обновляем данные: меняем все NULL на 0 (False)
    op.execute("UPDATE playlists SET is_system = 0 WHERE is_system IS NULL")

    # 2. Теперь делаем колонку обязательной (NOT NULL), чтобы null больше не появлялись
    # Используем batch_alter_table для совместимости с SQLite
    with op.batch_alter_table('playlists') as batch_op:
        batch_op.alter_column('is_system',
               existing_type=sa.Boolean(),
               nullable=False,
               server_default='0')


def downgrade() -> None:
    # Откат: делаем колонку снова необязательной (разрешаем NULL)
    with op.batch_alter_table('playlists') as batch_op:
        batch_op.alter_column('is_system',
               existing_type=sa.Boolean(),
               nullable=True,
               server_default=None)