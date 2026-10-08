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


def extract_date(val: object, tz_str: str | None = None) -> date | None:
    """
    Extracts a datetime.date object safely from date, datetime, ISO string, or None inputs.
    If tz_str is provided and val is a datetime (or ISO string with timezone),
    it converts the timestamp to the target timezone before determining the local calendar date.
    Returns None if value is None or cannot be parsed as a date.
    """
    if val is None:
        return None
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        if tz_str:
            user_tz = get_user_zone_info(tz_str)
            if val.tzinfo is not None:
                return val.astimezone(user_tz).date()
            return val.replace(tzinfo=timezone.utc).astimezone(user_tz).date()
        return val.date()
    if isinstance(val, str):
        try:
            dt = datetime.fromisoformat(val)
            if tz_str:
                user_tz = get_user_zone_info(tz_str)
                if dt.tzinfo is not None:
                    return dt.astimezone(user_tz).date()
                return dt.replace(tzinfo=timezone.utc).astimezone(user_tz).date()
            return dt.date()
        except (ValueError, TypeError):
            pass
        try:
            return date.fromisoformat(val.split("T")[0].split(" ")[0])
        except (ValueError, TypeError):
            return None
    return None
