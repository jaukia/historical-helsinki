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
    map.setCenter(60.166920, 24.936841, 14);

    map.setSelectedLayerChangeListener(function(mapName) {
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
    
    $("#bgToggle").click(function() {
        var $this = $(this);
        if($this.text()==="Road") {
            $this.text("Aerial");
            map.selectBaseLayer('bg-aerial');
            $("body").addClass("dark-bg");
        } else {
            $this.text("Road");
            map.selectBaseLayer('bg-road');
            $("body").removeClass("dark-bg");
        }
    });
    
    // MODE SELECTOR
    
    $("#modeToggle").click(function() {
        var $this = $(this);
        if($this.text()==="Lens") {
            $this.text("Transparency");
            map.setMode('transparency');
            $("#transparencySliderContainer").show();
            $("#lensSliderContainer").hide();
        } else {
            $this.text("Lens");
            map.setMode('lens');
            $("#transparencySliderContainer").hide();
            $("#lensSliderContainer").show();
        }
    });
    
    // TRANSPARENCY SLIDER SETUP
    
    $("#transparencySlider").noUiSlider({
        range: [0, 255],
        start: [255],
        handles: 1,
        step: 5,
        slide: function() {
            var value = $(this).val();
            var roundValue = value/255.0;
            map.setTransparency(roundValue);
        }
    });
    
    // LENS SLIDER SETUP
    
    $("#lensSlider").noUiSlider({
        range: [0, 512],
        start: [128],
        handles: 1,
        step: 5,
        slide: function() {
            var value = $(this).val();
            var roundValue = value/255.0;
            map.setLensSize(roundValue);
        }
    });
    
    // SELECT LIST STYLING
    
    //$("select").customSelect();
    
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
    
    this.map = new OpenLayers.Map(div, OpenLayers.Util.applyDefaults({
        displayProjection:  new OpenLayers.Projection('EPSG:4326'),
        projection: 'EPSG:900913',
        numZoomLevels: 19,
        controls: [
            new OpenLayers.Control.Zoom(),
            new OpenLayers.Control.Navigation(),
            new OpenLayers.Control.TouchNavigation()
        ]
    }));
    
    this.layers = {};
    this.markerLayers = {};
    
    this.addOSMLayer('bg-road');
    this.addTMSLayer('bg-aerial', layerAerialArgs);

    
    this.selectedLayer = null;
    this.mode = "lens";
    this.transparency = 250;
    this.selectedLayerChangeListener = null;
    this.lensSize = 0.5;
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
    
    createMarker: function(data,targetMap) {
    
        var size = new OpenLayers.Size(35,35);
        var offset = new OpenLayers.Pixel(-(size.w/2), -(size.h/2));
        var icon = new OpenLayers.Icon('img/marker.png',size,offset);
        
        var lonlat = (new OpenLayers.LonLat.fromArray(data.pos)).transform(
            new OpenLayers.Projection("EPSG:4326"),
            this.map.getProjectionObject()
        );
        
        var content = data.content;

        var marker = new OpenLayers.Marker(lonlat,icon);
        
        var popup;
        var popupShown = false;
        
        // FIXME: handle popups being created multiple times on mouseovers!
        
        marker.events.register('mousedown', marker, function(evt) {
            evt.stopPropagation();
            evt.preventDefault();
            
            if(!popup) {
                popup = new OpenLayers.Popup.FramedCloud(null,
                    lonlat,
                    new OpenLayers.Size(330,200),
                    content,
                    null,
                    true, function(evt) {
                        popup.hide();
                        popupShown = false;
                    });
                popup.panMapIfOutOfView = false;
                popup.autoSize = false;
                targetMap.addPopup(popup);
            } else {
                if(!popupShown) {
                    popup.show();
                }
            }
            popupShown = true;
            
            return false;
        });
        
        /*marker.events.register('mouseout', marker, );*/

        return marker;
    },
    
    createMarkerLayer: function(name,targetMap) {
        var markerLayer = new OpenLayers.Layer.Markers("name");
        this.markerLayers[name] = markerLayer;
        
        markerLayer.addMarker(
            this.createMarker({pos:[24.936841,60.166920], content: "Compiled by C.W. Gyldén. He was the over director of National Land Survey of Finland. In addition to this, he owned to whole Lauttasaari. Interesting in this map are the tolls along the roads to the north 'Tavast tull' and north-west 'Esbo tull'. You can also see the long and short bridges leading to Siltasaari, of which nowadays only the long one, 'Pitkäsilta' is left. The railway to city centre is missing, in the place of the current central railway station there is the Glo (Kluuvi) bay."},targetMap)
        );
        
        
        
        return markerLayer;
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
    
    setLensSize: function(lensSize) {
        this.lensSize = lensSize;
        
        var pxSize = 100+Math.round((lensSize*400)/2)*2;
        
        var elem = $(".olControlLayerLens");
        
        var oldPxSize = elem.width();
        var halfSizeDiff = Math.round((oldPxSize-pxSize)/2);
        
        elem.width(pxSize+"px");
        elem.height(pxSize+"px");
        
        var leftPos = parseInt(elem.css("left"),10);
        if(elem.css("left")==="auto") {
            leftPos = 400;
        }
        
        var topPos = parseInt(elem.css("top"),10);
        if(elem.css("top")==="auto") {
            topPos = 400;
        }
        
        elem.css("left",leftPos+halfSizeDiff+"px");
        elem.css("top", topPos+halfSizeDiff+"px");
        
        this.layerLens.update();
            
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
            
            this.layerLens.addLayer(this.createMarkerLayer("kukkanen",this.layerLens.getMap()));
            //this.layerLens.addLayer(this.createMarkerLayer("kukkanen",this.map));
            
            this.layerLens.update();
            
            this.selectedLayer.setVisibility(false);
            
            this.setLensSize(this.lensSize);
            
        }
    }
};
