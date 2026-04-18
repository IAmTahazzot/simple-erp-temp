run:
	@npx expo start

i:
	@npx expo install $(filter-out $@,$(MAKECMDGOALS))

%:
	@:

