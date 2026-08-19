import os
import sys

def main():
    print("--- Running Pre-Deploy Step 1: Alembic Database Migrations ---")
    ret_migration = os.system("alembic upgrade head")
    if ret_migration != 0:
        print("ERROR: Database migrations failed!", file=sys.stderr)
        sys.exit(ret_migration)

    # Check for environment variable authorizing test subject seeding on deployment
    seed_flag = (
        os.getenv("SEED_TEST_SUBJECTS_PRODUCTION", "").lower() in ("true", "1", "yes")
        or os.getenv("DEMO_SEED_PRODUCTION", "").lower() in ("true", "1", "yes")
    )

    if seed_flag:
        print("--- Running Pre-Deploy Step 2: Test Subject Database Seeding ---")
        ret_seed = os.system("python -m app.seed_demo_data --force-production")
        if ret_seed != 0:
            print("ERROR: Test subject seeding failed!", file=sys.stderr)
            sys.exit(ret_seed)
        print("--- Test Subject Database Seeding Completed Successfully ---")
    else:
        print("--- Pre-Deploy Step 2 Skipped (SEED_TEST_SUBJECTS_PRODUCTION flag not set) ---")

if __name__ == "__main__":
    main()
