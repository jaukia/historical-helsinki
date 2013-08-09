/* Copyright (c) 2006-2011 by OpenLayers Contributors (see authors.txt for
 * full list of contributors). Published under the Clear BSD license.
 * See http://svn.openlayers.org/trunk/openlayers/license.txt for the
 * full text of the license. */

/**
 * @requires OpenLayers/Control.js
 * @requires OpenLayers/Handler/Drag.js
 * @requires OpenLayers/Map.js
 */

/**
 * Class: OpenLayers.Control.LayerLens
 *
 * Inerits from:
 *  - <OpenLayers.Control>
 */
OpenLayers.Control.LayerLens = OpenLayers.Class(OpenLayers.Control, {

    /**
     * APIProperty: layer
     * {<OpenLayers.Layer>}
     */
    layer: null,

    /**
     * Property: lensmap
     * {<OpenLayers.Map>}
     */
    lensmap: null,

    /**
     * APIProperty: draggable
     * {Boolean}
     */
    draggable: true,

    initialize: function(layer, options) {
        OpenLayers.Control.prototype.initialize.apply(this, [options]);
        this.layer = layer;
    },

    /**
     * APIMethod: setLayer
     *
     * Parameters:
     * layer - {OpenLayers.Layer}
     */
    setLayer: function(layer) {
        this.lensmap.removeLayer(this.layer);
        this.layer = layer;
        this.lensmap.addLayer(this.layer);
    },
    
    // brutal, will not be cleaned up by setLayer
    addLayer: function(layer) {
        this.lensmap.addLayer(layer);
    },
    
    getMap: function() {
        return this.lensmap;
    },

    draw: function(px) {
        OpenLayers.Control.prototype.draw.apply(this, arguments);
        this.lensmap = new OpenLayers.Map(this.div, OpenLayers.Util.applyDefaults({
            controls: [],
            layers: [this.layer]
        }, this.map.options));

        if (this.draggable) {
            this.layer.tileLoadingDelay = 0;
            
            // Added documentDrag here / Janne A
            
            // disabling this handler disables moving the lens by dragging
            
            /*
            this.handler = new OpenLayers.Handler.Drag(this, {
                move: this.drag
            }, {
                down: OpenLayers.Event.stop,
                documentDrag: true
            } );
            this.handler.setMap(this.lensmap);
            this.handler.activate();
            */
            
            var corners = ["tl","bl","tr","br"];
            var startDrag = false;
            var dragCorner = null;
            var prevPos = null;
            
            var layerLensControl = this;
            
            // yksi vaihtis olisi, että linssi olisi aina keskellä!
            
            var handleMouseMove = function(e) {
                
                if(!startDrag) {
                    return true;
                }
                
                e.stopPropagation();
                e.preventDefault();
           
                var xd = prevPos[0]-e.pageX;
                var yd = prevPos[1]-e.pageY;
                
                prevPos = [e.pageX,e.pageY];
                
                // avoid flickering by pixel impresision
                
                if(xd%2===1||xd%2===-1) {
                    xd-=1;
                    prevPos[0]+=1;
                }
                
                if(yd%2===1||yd%2===-1) {
                    yd-=1;
                    prevPos[1]+=1;
                }
                
                var elem = layerLensControl.div;
               
                var left = elem.offsetLeft;
                var top = elem.offsetTop;
                var width = parseInt(elem.style.width,10);
                var height = parseInt(elem.style.height,10);
                
                if(dragCorner=="tl" || dragCorner=="bl") {
                    elem.style.left = (left-xd) + "px";
                    elem.style.width = (width+xd) + "px";
                }
                
                if(dragCorner=="tl" || dragCorner=="tr") {
                    elem.style.top = (top-yd) + "px";
                    elem.style.height = (height+yd) + "px";
                }
                
                if(dragCorner=="tr" || dragCorner=="br") {
                    elem.style.width = (width-xd) + "px";
                }
                
                if(dragCorner=="bl" || dragCorner=="br") {
                    elem.style.height = (height-yd) + "px";
                }
                
                layerLensControl.update();
                    
                
                return false;
                
           };
            
            var handleMouseUp = function() {
                startDrag = false;
            };
            
            document.body.addEventListener("mouseup", handleMouseUp, true);
            document.body.addEventListener("mousemove", handleMouseMove, true);
            
            for(var i=0;i<corners.length;i++) {
                (function(curCorner) {
                    var button = document.createElement('div');
                    button.setAttribute("class","resizeButton "+curCorner);
                    this.div.appendChild(button);
                    
                    var handleResizeStart = function(e) {
                        console.log("start",curCorner,this);
                        startDrag = true;
                        dragCorner = curCorner;
                        prevPos = [e.pageX,e.pageY];
                        
                        // on mousemove, move the elem
                        // on document mouseup, stop dragging
                    };
                    
                    // FIXME: IE8 and older would need attachEvent
                    button.addEventListener("mousedown", handleResizeStart, false);
                
                }.call(this,corners[i]));
            }
        }

        this.map.events.register('move', this, this.update);

        OpenLayers.Element.addClass(this.div, 'olScrollable');

        return this.div;
    },

    drag: function(px) {
        var left = this.div.offsetLeft - (this.handler.start.x - px.x);
        var top = this.div.offsetTop - (this.handler.start.y - px.y);
        this.div.style.left = left + "px";
        this.div.style.top = top + "px";
        this.update();
    },

    update: function() {
        var px = {
            x: this.div.offsetLeft + (this.div.offsetWidth / 2),
            y: this.div.offsetTop + (this.div.offsetHeight / 2)
        };
        
        this.lensmap.updateSize();
        this.lensmap.moveTo(this.map.getLonLatFromPixel(px),
                            this.map.getZoom());
    },

    destroy: function() {
        if (this.lensmap) {
            this.lensmap.destroy();
        }
        this.map.events.unregister('move', this, this.update);
        OpenLayers.Control.prototype.destroy.apply(this, arguments);
    },

    CLASS_NAME: 'OpenLayers.Control.LayerLens'
});
