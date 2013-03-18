#########################
# FETCH HELSINKI1943
#########################

# from: http://www.hri.fi/fi/data/helsingin-ortokuva-1943/
# something like this should work, not tested
curl http://datastore.hri.fi/Helsinki/kuvat/Helsinki_orto_1943.zip > Helsinki_orto_1943.zip
unzip Helsinki_orto_1943.zip
cp Helsinki_orto_1943/Helsinki_orto_1943.tif tools/source-maps/helsinki1943.tif
rm -r Helsinki_orto_1943
rm Helsinki_orto_1943.zip