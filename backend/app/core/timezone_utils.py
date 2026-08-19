from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def get_user_zone_info(user_tz_str: str | None) -> ZoneInfo:
    """
    Safely resolves an IANA timezone identifier into a ZoneInfo instance.
    Defaults to UTC if string is invalid or missing.
    """
    if not user_tz_str:
        return ZoneInfo("UTC")
    try:
        return ZoneInfo(user_tz_str.strip())
    except (ZoneInfoNotFoundError, ValueError, Exception):
        return ZoneInfo("UTC")


def get_timezone_aware_range(
    period_start: date, period_end: date, tz_str: str | None
) -> tuple[datetime, datetime]:
    """
    Calculates UTC start and end datetimes for a local date period [period_start, period_end]
    in the user's configured IANA timezone.
    """
    user_tz = get_user_zone_info(tz_str)

    start_local = datetime.combine(period_start, time.min, tzinfo=user_tz)
    end_local = datetime.combine(period_end, time.max, tzinfo=user_tz)

    start_utc = start_local.astimezone(timezone.utc)
    end_utc = end_local.astimezone(timezone.utc)

    return start_utc, end_utc


def get_user_today_date(tz_str: str | None) -> date:
    """
    Returns current date in the user's configured IANA timezone.
    """
    user_tz = get_user_zone_info(tz_str)
    return datetime.now(user_tz).date()
