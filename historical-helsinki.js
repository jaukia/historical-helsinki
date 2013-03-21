
/*
 * Slider setup
 */

function init_slider() {
    var slider = YAHOO.widget.Slider.getHorizSlider("sliderbg", "sliderthumb", 0, 209, 10);
    slider.getRealValue = function() {
      return Math.round(this.getValue() * 0.005 * 100) / 100;
    }
    slider.setValue(209);
    slider.subscribe("change", function(offsetFromStart) {
        // FIXME: loop all layers, or do this only for the visible layers
      map.layers['Map from 1837'].setOpacity(slider.getRealValue());
      map.layers['Map from 1897'].setOpacity(slider.getRealValue());
      map.layers['Aerial photos 1943'].setOpacity(slider.getRealValue());
      map.layers['Smith-Polvinen plan for Helsinki'].setOpacity(slider.getRealValue());
    });
}

/**
 * Based on:
 * http://teczno.com/old-oakland/OaklandLayers.js
 */

/**
 * Given a set of coordinates for a tile, return a directory-style string.
 *
 * @param   x   Number  column
 * @param   y   Number  row
 * @param   z   Number  zoom
 *
 * @return  String  E.g. "0313131311132123" suitable for inclusion in a tile URL
 */
function coordinateToString(x, y, z) {
    var a = [];
    
    for(var i = 0; i < z; i += 1) {
        var r = (y & 1);
        var c = (x & 1);
        
        a.unshift(c | (r << 1));
        
        x = x >> 1;
        y = y >> 1;
    }
    
    s = '';
    
    for(var i = 0; i < a.length; i += 1) {
        s += a[i].toString();
    }
    
    return s;
}

function getXYZ(layer, bounds) {

    var res = layer.map.getResolution();
    var x = Math.round ((bounds.left - layer.maxExtent.left) / (res * layer.tileSize.w));
    var y = Math.round ((layer.maxExtent.top - bounds.top) / (res * layer.tileSize.h));
    var z = layer.map.getZoom();
    
    return [x, y, z];
}

/*
 * Returns a getURL() method for use in layer args.
 */
function getGetURLMethod(bucket_id, file_ext) {
    return function(bounds)
    {
        var xyz = getXYZ(this, bounds);
        var x = xyz[0], y = xyz[1], z = xyz[2];
        
        return bucket_id+'/'+z+'-r'+y+'-c'+x+'.'+file_ext;
    };
}

/**
 * Wrapper for map.
 */
function HelsinkiMap(div) {

    /* The "correct" way to invoke a spherical mercator slippy grid map, per crshmidt's advice */
    var mapArgs = {
        maxExtent: new OpenLayers.Bounds(-20037508.3427892, -20037508.3427892, 20037508.3427892, 20037508.3427892),
        numZoomLevels: 18,
        maxResolution: 156543.0339,
        units: 'm',
        controls:[], 
        displayProjection:  new OpenLayers.Projection('EPSG:4326'),
        projection: 'EPSG:900913'
    };
    
    var layerAerialArgs = {
        buffer: 0,
        getURL: function(bounds)
        {
            var xyz = getXYZ(this, bounds);
            var x = xyz[0], y = xyz[1], z = xyz[2];
            
            // predictable? server: 0, 1, 2, 3
            var s = (x + y + z) % 4;
            
            return 'http://a'+s+'.ortho.tiles.virtualearth.net/tiles/a'+coordinateToString(x, y, z)+'.jpeg?g=90';
        },
        isBaseLayer: true
    };

    var layerVEarthArgs = {
        buffer: 0,
        getURL: function(bounds)
        {
            var xyz = getXYZ(this, bounds);
            var x = xyz[0], y = xyz[1], z = xyz[2];
            
            // predictable? server: 0, 1, 2, 3
            var s = (x + y + z) % 4;
            
            return 'http://r'+s+'.ortho.tiles.virtualearth.net/tiles/r'+coordinateToString(x, y, z)+'.png?g=90&shading=hill';
        },
        isBaseLayer: true
    };

    var layer1897Args = {
        buffer: 0,
        getURL: getGetURLMethod('tiles/helsinki1897', 'png'),
        isBaseLayer: false,
        visibility: true
    };
    
    var layer1837Args = {
        buffer: 0,
        getURL: getGetURLMethod('tiles/helsinki1837', 'png'),
        isBaseLayer: false,
        visibility: false
    };
    
    var layer1943Args = {
        buffer: 0,
        getURL: getGetURLMethod('tiles/helsinki1943', 'png'),
        isBaseLayer: false,
        visibility: false
    };
    
    var layerSmithPolvinenArgs = {
        buffer: 0,
        getURL: getGetURLMethod('tiles/smithpolvinen-m1', 'png'),
        isBaseLayer: false,
        visibility: false
    };
    
    this.map = new OpenLayers.Map(div, mapArgs);
    
    this.layers = {};
    this.addHistoricalLayer('Map from 1837', layer1837Args);
    this.addHistoricalLayer('Map from 1897', layer1897Args);
    this.addHistoricalLayer('Aerial photos 1943', layer1943Args);
    this.addHistoricalLayer('Smith-Polvinen plan for Helsinki', layerSmithPolvinenArgs);
    this.addHistoricalLayer('Present Day (VEarth road)', layerVEarthArgs);
    this.addHistoricalLayer('Present Day (VEarth aerial)', layerAerialArgs);

    this.map.addControl(new OpenLayers.Control.LayerSwitcher());
    this.map.addControl(new OpenLayers.Control.Navigation());
    this.map.addControl(new OpenLayers.Control.PanZoomBar() );
    //this.map.addControl(new OpenLayers.Control.Permalink());
    //this.map.addControl(new OpenLayers.Control.ScaleLine());

    this.setCenter(60.166920, 24.936841, 13);
}

HelsinkiMap.prototype = {

   /**
    * Project latitude and longitude before passing onto the map object.
    *
    * @param    lat     Number  latitude in degrees
    * @param    lon     Number  longitude in degrees
    * @param    zoom    Number  zoom level integer
    */
    setCenter: function(lat, lon, zoom) {
        var lonlat = new OpenLayers.LonLat(lon, lat);
        lonlat.transform(this.map.displayProjection, this.map.getProjectionObject());
        this.map.setCenter(lonlat, zoom);
    },
    
    addHistoricalLayer: function(name, args) {
        this.layers[name] = new OpenLayers.Layer.TMS(name, null, args);
        this.map.addLayer(this.layers[name]);
    },
    
    showBaseLayer: function(name) {
        this.map.setBaseLayer(this.layers[name]);
        return false;
    },
    
    showHistoricalLayer: function(name) {
        for(var i in this.layers) {
            if(i==name) {
                //this.layers[i].display(true);
                this.layers[i].setVisibility(true);
            } else if(!this.layers[i].isBaseLayer) {
                //this.layers[i].display(false);
                this.layers[i].setVisibility(false);
            }
        }
        return false;
    }
};
