def split_amount(amount: int, rate: float) -> tuple[int, int]:
    commission = int(round(amount * rate))
    return commission, amount - commission


def rub(value: int) -> str:
    return f"{value:,}".replace(",", " ")
