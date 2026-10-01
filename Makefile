.PHONY: setup dev verify up down migrate generate signal-check pii-scan seed train evaluate lint typecheck test-unit test-int clean venvs

# The app's own env file supplies DATABASE_URL to migrate/seed/train/evaluate.
-include apps/web/.env.local
export DATABASE_URL

# Two venvs because their pins differ: scripts/ (data generation and gates)
# and the ML service (serving + training + dev tools).
ML_PY := apps/ml-service/.venv/bin/python
SCRIPTS_PY := scripts/.venv/bin/python

# README.md §Setup, architecture/deployment-architecture.md §3.1.
# Clean clone -> running, seeded stack in <= 30 min (NFR-17, TC-DOC-001).
setup: venvs up migrate generate signal-check pii-scan seed train evaluate

venvs: $(ML_PY) $(SCRIPTS_PY)

$(ML_PY):
	python3.11 -m venv apps/ml-service/.venv
	$(ML_PY) -m pip install -q -r apps/ml-service/training/requirements.txt -r apps/ml-service/requirements-dev.txt

$(SCRIPTS_PY):
	python3.11 -m venv scripts/.venv
	$(SCRIPTS_PY) -m pip install -q -r scripts/requirements.txt

dev:
	docker compose up -d postgres ml-service
	pnpm --filter web run dev

verify: lint typecheck test-unit test-int
	bash scripts/evaluation/no_hardcode_check.sh

up:
	docker compose up -d
	@echo "waiting for postgres, ml-service to report healthy..."
	@timeout=120; \
	until [ "$$(docker compose ps --format '{{.Health}}' postgres ml-service | grep -c healthy)" = "2" ] || [ $$timeout -le 0 ]; do \
		sleep 3; timeout=$$((timeout-3)); \
	done

down:
	docker compose down

migrate:
	pnpm --filter @cyberpulse/db run migrate

generate:
	$(SCRIPTS_PY) scripts/generate-data/generator.py

signal-check:
	$(SCRIPTS_PY) scripts/evaluation/signal_check.py

pii-scan:
	$(SCRIPTS_PY) scripts/evaluation/pii_scan.py

seed:
	pnpm --filter @cyberpulse/db run seed

train:
	$(ML_PY) apps/ml-service/training/train.py

evaluate:
	$(ML_PY) apps/ml-service/training/evaluate.py

lint:
	pnpm run lint
	$(ML_PY) -m ruff check apps/ml-service

typecheck:
	pnpm run typecheck
	cd apps/ml-service && .venv/bin/python -m mypy app

test-unit:
	pnpm --filter web run test:unit
	cd apps/ml-service && .venv/bin/python -m pytest -m unit -q

test-int:
	pnpm --filter web run test:int

clean:
	docker compose down -v
