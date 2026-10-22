.PHONY: install seed api web test build docker

install:
	cd backend && pip install -r requirements-dev.txt
	cd frontend && npm install

seed:
	cd backend && python -m seed.seed

api:
	cd backend && uvicorn app.main:create_app --factory --reload --port 8000

web:
	cd frontend && npm run dev

test:
	cd backend && pytest
	cd frontend && npm test

build:
	cd frontend && npm run build

docker:
	docker build -t acme-salary . && docker run --rm -p 8000:8000 -v acme-salary-data:/data acme-salary
