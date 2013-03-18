# Historical Helsinki

A web site for displaying historical map overlays on top of map of Helsinki.

For licenses and copyrights, see LICENCES.txt.

## Installation

* Download GDAL Complete from:
http://www.kyngchaos.com/software:frameworks#gdal_complete
* Install GDAL Complete & NumPY from the package
* Install GDAL with "brew install gdal"
* Install PIL with "brew install pil"

## Generating coordinates

* Use Photoshop to find pixel coordinates
* Use lat-lon tool to find the matching map coordinates:
  http://www.gorissen.info/Pierre/maps/googleMapLocationv3.php

## Fetch missing map data

Some files are too big to keep in the repository. They need to be fetched separately.

* Run "cd tools; ./fetch-map-data.sh"

## Creating map tiles

* Run "cd tools; ./generate-tiles.sh"