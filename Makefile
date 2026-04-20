run:
	@npx expo start

b:
	@cd android && ./gradlew assembleRelease

i:
	@npx expo install $(filter-out $@,$(MAKECMDGOALS))

%:
	@:

