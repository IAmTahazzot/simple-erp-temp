run:
	@npx expo start

build:
	@cd android && ./gradlew assembleRelease
	
db:
	MSYS_NO_PATHCONV=1 adb shell -t run-as com.anonymous.app /data/data/com.anonymous.app/sqlite3 erp.db

i:
	@npx expo install $(filter-out $@,$(MAKECMDGOALS))

%:
	@:

