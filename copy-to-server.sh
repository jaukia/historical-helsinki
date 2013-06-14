##initial sync:
#tar -czf historical-helsinki.tar.gz *.* lib style tiles
#scp historical-helsinki.tar.gz jaukia@kapsi.fi:sites/jaukia.kapsi.fi/www/.
#historical-helsinki.tar.gz

#upgrading:
rsync -azhv --delete --exclude *.DS_Store --exclude .git* --exclude misc --exclude tools/tmp --exclude tools/out --exclude tools/todo.txt --exclude tools/source-maps /Users/jaukia/Dropbox/gitprojects/historical-helsinki/* jaukia@kapsi.fi:~/sites/www.historical-helsinki.net/www

