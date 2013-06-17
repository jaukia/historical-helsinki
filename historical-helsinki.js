/* Some parts of the code based on Old Oakland by M. Migurski, used with permission */

$(document).ready(function() {

    // SETUP CORE FUNCTIONALITY
    
    var historicalLayers = [
        {name:"1837: Map by C.W. Gyldén", id:"helsinki1837"},
        {name:"1897: Map by Matkailija-Yhdistys", id:"helsinki1897"},
        {name:"1943: Aerial photos", id:"helsinki1943"},
        {name:"1968: Smith-Polvinen plan (II, M1)", id:"smithpolvinen-m1"}
    ];
    
    var initialLayer = 1;
                           
    map = new HistoricalMap('map');
    map.setCenter(60.166920, 24.936841, 13);

    map.setSelectedLayerChangeListener(function(mapName) {
        console.log("hiphei",mapName);
        $(".mapDetails > div").hide();
        $(".mapDetails #"+mapName+"-details").show();
    });

    var mapSelector = $("select");
    
    for(var i=0;i<historicalLayers.length;i++) {
        var curLayer = historicalLayers[i];
        map.addHistoricalLayer(curLayer.id);
        
        var optElem = $('<option value="'+curLayer.id+'">'+curLayer.name+'</option>');
        
        if(initialLayer===i) {
            optElem.attr("selected","selected");
            map.selectHistoricalLayer(curLayer.id);
        }
        
        mapSelector.append(optElem);
    }
    
    // SETUP LAYER SELECTOR
    
    $("select").change(function() {
        var value = this.options[this.selectedIndex].value;  
        map.selectHistoricalLayer(value);
        /*var $mapDetails = $("#"+value+"-details");
        $(".mapDetails div").hide();
        $mapDetails.show();*/
    });

    // BACKGROUND LAYER SELECTOR
    
    $("#roadMapLink").click(function() {
        if(!$(this).hasClass("active")) {
            map.selectBaseLayer('bg-road');
            $(".backgroundMapLink").toggleClass("active");
        }
    });
    
    $("#aerialMapLink").click(function() {
        if(!$(this).hasClass("active")) {
            map.selectBaseLayer('bg-aerial');
            $(".backgroundMapLink").toggleClass("active");
        }
    });
    
    // MODE SELECTOR
    
    $("#lensModeLink").click(function() {
        if(!$(this).hasClass("active")) {
            map.setMode('lens');
            $("#slider").hide();
            $(".modeLink").toggleClass("active");
        }
    });
    
    $("#transparencyModeLink").click(function() {
        if(!$(this).hasClass("active")) {
            map.setMode('transparency');
            $("#slider").show();
            $(".modeLink").toggleClass("active");
        }
    });
    
    // SLIDER SETUP
    
    $("#slider").noUiSlider({
        range: [0, 255],
        start: [200],
        handles: 1,
        step: 1,
        slide: function(){
            var value = $(this).val();
            console.log("slide",value);
            var roundValue = value/255.0;
            map.setTransparency(roundValue);
        }
    });
    
});

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

function constructGetURLMethod(bucket_id, file_ext) {
    return function(bounds) {
        var xyz = getXYZ(this, bounds);
        var x = xyz[0], y = xyz[1], z = xyz[2];
        return bucket_id+'/'+z+'-r'+y+'-c'+x+'.'+file_ext;
    };
}

// Map object implementation

function HistoricalMap(div) {

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
        getURL: function(bounds) {
            var xyz = getXYZ(this, bounds);
            var x = xyz[0], y = xyz[1], z = xyz[2];
            // predictable? server: 0, 1, 2, 3
            var s = (x + y + z) % 4;
            return 'http://a'+s+'.ortho.tiles.virtualearth.net/tiles/a'+coordinateToString(x, y, z)+'.jpeg?g=90';
        },
        isBaseLayer: true
    };
    
    this.map = new OpenLayers.Map(div, mapArgs);
    
    this.layers = {};
    
    this.addOSMLayer('bg-road');
    this.addTMSLayer('bg-aerial', layerAerialArgs);

    this.map.addControl(new OpenLayers.Control.LayerSwitcher());
    this.map.addControl(new OpenLayers.Control.Navigation());
    this.map.addControl(new OpenLayers.Control.PanZoomBar());
    
    this.selectedLayer = null;
    this.mode = "lens";
    this.transparency = 250;
    this.selectedLayerChangeListener = null;
}

HistoricalMap.prototype = {

    setCenter: function(lat, lon, zoom) {
        var lonlat = new OpenLayers.LonLat(lon, lat);
        lonlat.transform(this.map.displayProjection, this.map.getProjectionObject());
        this.map.setCenter(lonlat, zoom);
    },
    
    addTMSLayer: function(name, args) {
        this.layers[name] = new OpenLayers.Layer.TMS(name, null, args);
        this.map.addLayer(this.layers[name]);
    },
    
    addOSMLayer: function(name) {
        this.layers[name] = new OpenLayers.Layer.OSM("OpenStreetMap","http://otile1.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png",{numZoomLevels: 19});
        this.map.addLayer(this.layers[name]);
    },
    
    addHistoricalLayer: function(name) {
        var args = {
            buffer: 0,
            getURL: constructGetURLMethod('tiles/'+name, 'png'),
            isBaseLayer: false,
            visibility: false
        };
        return this.addTMSLayer(name, args);
    },
    
    selectBaseLayer: function(name) {
        this.map.setBaseLayer(this.layers[name]);
        return false;
    },
    
    getSelectedLayer: function(name) {
        return this.selectedLayer;
    },
    
    setTransparency: function(value) {
        this.transparency = value;
        this.selectedLayer.setOpacity(value);
    },
    
    selectHistoricalLayer: function(name) {
        for(var i in this.layers) {
            if(i==name) {
                this.layers[i].setVisibility(true);
                this.selectedLayer = this.layers[i];
                if(this.mode==="lens") {
                    // init lens with the new layer
                    this.setMode("lens");
                } else if(this.mode==="transparency") {
                    this.setTransparency(this.transparency);
                }
                this.selectedLayerChangeListener.call(null,name);
            } else if(!this.layers[i].isBaseLayer) {
                this.layers[i].setVisibility(false);
            }
        }
        return false;
    },
    
    getOpenLayersMap: function() {
        return this.map;
    },
    
    setSelectedLayerChangeListener: function(listenerFunc) {
        this.selectedLayerChangeListener = listenerFunc;
    },
    
    setMode: function(mode) {
    
        if(mode==="transparency") {
            
            if(this.layerLens) {
                // this does destroying of the layerLens automatically?
                this.map.removeControl(this.layerLens);
                this.layerLens = null;
            }
            
            this.mode = "transparency";
            this.selectedLayer.setVisibility(true);
            
        } else if(mode==="lens") {
            this.mode = "lens";
            
            var curLayerName = this.selectedLayer.name;
            // has to be a base layer for lens to work
            var args = {
                buffer: 0,
                getURL: constructGetURLMethod('tiles/'+curLayerName, 'png'),
                isBaseLayer: true,
                visibility: false
            };
         
            var lensLayer = new OpenLayers.Layer.TMS(curLayerName, null, args);
            
            if(this.layerLens) {
                this.layerLens.setLayer(lensLayer);
            } else {
                this.layerLens = new OpenLayers.Control.LayerLens(lensLayer);
                this.map.addControl(this.layerLens);
            }
            this.layerLens.update();
            
            this.selectedLayer.setVisibility(false);
            
        }
    }
};
