run:
	@npx expo start

build:
	@cd android && ./gradlew assembleRelease

injectSqlite:
	@MSYS_NO_PATHCONV=1 adb push sqlite3 /data/local/tmp/
	@MSYS_NO_PATHCONV=1 adb shell "chmod 755 /data/local/tmp/sqlite3"
	adb shell "run-as com.anonymous.app cp /data/local/tmp/sqlite3 /data/data/com.anonymous.app/sqlite3"
	adb shell "run-as com.anonymous.app chmod +x /data/data/com.anonymous.app/sqlite3"
	
db:
	@MSYS_NO_PATHCONV=1 adb shell -t run-as com.anonymous.app /data/data/com.anonymous.app/sqlite3 erp.db
	
i:
	@npx expo install $(filter-out $@,$(MAKECMDGOALS))

%:
	@:

