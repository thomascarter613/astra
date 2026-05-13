.PHONY: setup install dev build lint test clean

setup: install
	bun run lefthook install

install:
	bun install

dev:
	turbo run dev

build:
	turbo run build

lint:
	biome check .
	
format:
	biome format --write .

test:
	turbo run test

clean:
	rm -rf node_modules
	rm -rf .turbo
	rm -rf dist
