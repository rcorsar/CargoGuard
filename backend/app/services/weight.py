from app.errors import AppError

# Границы 3 кг и 20 кг заданы только здесь. Экран группу не назначает.
# Тяжёлая группа в интерфейсе называется 20+, в задании это 20-100+ кг.


def group_for_weight(weight_kg: float) -> str:
    if weight_kg <= 0:
        raise AppError(400, "Масса должна быть больше нуля")
    if weight_kg <= 3:
        return "0-3"
    if weight_kg <= 20:
        return "3-20"
    return "20+"
