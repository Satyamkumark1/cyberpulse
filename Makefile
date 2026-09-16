.PHONY: setup dev verify up down migrate generate signal-check pii-scan seed train evaluate lint typecheck test-unit test-int clean

# README.md §Setup, architecture/deployment-architecture.md §3.1.
# Clean clone -> running, seeded stack in <= 30 min (NFR-17, TC-DOC-001).
setup: up migrate generate signal-check pii-scan seed
	@if [ -f apps/ml-service/training/train.py ]; then \
		$(MAKE) train evaluate; \
	else \
		echo "training/evaluate.py not yet built (Phase 3) — stack is up, seeded, and ready to develop against."; \
	fi

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
	pnpm run generate:data

signal-check:
	pnpm run signal:check

pii-scan:
	pnpm run pii:scan

seed:
	pnpm --filter @cyberpulse/db run seed

train:
	python3 apps/ml-service/training/train.py

evaluate:
	python3 apps/ml-service/training/evaluate.py

lint:
	pnpm run lint
	cd apps/ml-service && ruff check .

typecheck:
	pnpm run typecheck
	cd apps/ml-service && mypy app

test-unit:
	pnpm --filter web run test:unit
	cd apps/ml-service && pytest -m unit -q

test-int:
	pnpm --filter web run test:int

clean:
	docker compose down -v
