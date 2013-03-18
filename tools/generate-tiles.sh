#########################
# PROCESS HELSINKI1943
#########################

rm -r tmp
mkdir tmp

gdalwarp -t_srs "+proj=latlong +ellps=WGS84 +datum=WGS84 +no_defs" -r cubic -dstalpha -ts 40000 0 -srcnodata 0 source-maps/helsinki1943.tif tmp/helsinki1943-warped.tif

gdal_translate tmp/helsinki1943-warped.tif tmp/helsinki1943-warped-color.tif -b 1 -b 1 -b 1 -b mask

rm -r out
mkdir out

# generates ~ 31k images, takes ~ 12 hours
python decompose/decompose.py tmp/helsinki1943-warped-color.tif

rm -r ../tiles/helsinki1943
mv out ../tiles/helsinki1943

#########################
# PROCESS HELSINKI1837
#########################

rm -r tmp
mkdir tmp

# fast
gdal_translate -a_srs "+proj=latlong +ellps=WGS84 +datum=WGS84 +no_defs" -gcp 4026 1926 24.952070 60.170389 -gcp 2067 2844 24.927431 60.163633 -gcp 4404 1110 24.956700 60.175598 -gcp 3523 2889 24.946089 60.164198 -gcp 2697 3054 24.935589 60.162694 -of VRT source-maps/helsinki1837.jpg tmp/helsinki1837.vrt

# fast
rm tmp/helsinki1837-convcoords.tif
gdalwarp -t_srs "+proj=latlong +ellps=WGS84 +datum=WGS84 +no_defs" -dstalpha tmp/helsinki1837.vrt tmp/helsinki1837-convcoords.tif

rm -r out
mkdir out

# generates ~ 10k images, takes ~ 20min
python decompose/decompose.py tmp/helsinki1837-convcoords.tif

rm -r ../tiles/helsinki1837
mv out ../tiles/helsinki1837

rm -r tmp

#########################
# PROCESS HELSINKI1897
#########################

rm -r tmp
mkdir tmp

# fast
gdal_translate -a_srs "+proj=latlong +ellps=WGS84 +datum=WGS84 +no_defs" -gcp 1978 3575 24.936841 60.166920 -gcp 1859 3867 24.934459 60.163526 -gcp 1339 3884 24.926648 60.164155 -gcp 2602 3899 24.951518 60.163654 -gcp 2361 4125 24.946454 60.160974 -gcp 3007 2997 24.959757 60.174296 -gcp 3215 3564 24.965487 60.167902 -gcp 2802 3273 24.955573 60.170912 -gcp 1430 3520 24.924427 60.167326 -gcp 1838 4300 24.934802 60.158497 -gcp 2484 4488 24.949951 60.156703 -gcp 2636 4177 24.953835 60.160387 -gcp 2458 3077 24.947280 60.173031 -gcp 2480 2015 24.946389 60.184763 -gcp 1838 1898 24.931648 60.186086 -gcp 942 3465 24.912937 60.167654 -gcp 493 2190 24.901674 60.182042 -gcp 3975 2492 24.980893 60.180617 -gcp 1776 4372 24.933397 60.157679 -of VRT source-maps/helsinki1897.jpg tmp/helsinki1897.vrt

# fast
rm tmp/helsinki1897-convcoords.tif
gdalwarp -t_srs "+proj=latlong +ellps=WGS84 +datum=WGS84 +no_defs" -te 24.88 60.145 25.005 60.2145 -dstalpha tmp/helsinki1897.vrt tmp/helsinki1897-convcoords.tif

rm -r out
mkdir out

# generates ~ 10k images, takes ~ 20min
python decompose/decompose.py tmp/helsinki1897-convcoords.tif

rm -r ../tiles/helsinki1897
mv out ../tiles/helsinki1897

rm -r tmp

