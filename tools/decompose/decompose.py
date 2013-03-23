import sys
import re
import os
import ModestMaps
import subprocess
import tempfile
import PIL.Image

cs2cs = 'cs2cs'
gdalinfo = 'gdalinfo'
gdalwarp = 'gdalwarp'
gdal_translate = 'gdal_translate'

proj_bng = ['+proj=tmerc', '+lat_0=49', '+lon_0=-2', '+k=0.999601', '+x_0=400000', '+y_0=-100000', '+ellps=airy', '+units=m', '+towgs84=446.448,-125.157,542.060,0.1502,0.2470,0.8421,-20.4894', '+units=m', '+nodefs']
proj_gym = ['+proj=merc', '+datum=WGS84', '+a=6378137', '+b=6378137', '+lat_ts=0.0', '+lon_0=0.0', '+x_0=0.0', '+y_0=0', '+k=1.0', '+units=m', '+nadgrids=@null', '+no_defs', '-tl', '-r']
proj_gps = ['+proj=latlong', '+ellps=WGS84', '+datum=WGS84', '+no_defs']

max_zoom = 18
proj_in = proj_gps
proj_out = proj_gps

corner_pat = re.compile(r'^(Upper|Lower) (Left|Right) +\( *([\-\d\.]+), *([\-\d\.]+)\)', re.M)
projected_pat = re.compile(r'^"([\-\d\.]+)"\s+"([\-\d\.]+)"')

def proj_in_to_out(x, y):
    """ Given an x, y coordinate in GYM, return (lon, lat) in GPS.
    """
    proj = subprocess.Popen([cs2cs, '-f', '"%.15f"'] + proj_in + ['+to'] + proj_out, stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    proj.stdin.write('%.5f %.5f\n' % (x, y))
    proj.stdin.close()
    
    response = projected_pat.match(proj.stdout.read())
    
    print '%.5f %.5f' % (x, y), '--->', response.group(1), response.group(2)
    
    if response:
        return float(response.group(1)), float(response.group(2))

def image_bounds(filename):
    """ Given an aerial image filename, use gdalinfo to find its (northwest, southeast) bounds in GPS.
    """
    lats = []
    lons = []
    
    print tiff
    info = subprocess.Popen((gdalinfo, tiff), stdout=subprocess.PIPE).stdout.read()
    
    for corner in corner_pat.finditer(info):
        try:
            lon, lat = proj_in_to_out(float(corner.group(3)), float(corner.group(4)))
        except:
            pass
        else:
            lats.append(lat)
            lons.append(lon)
            
    return ModestMaps.Geo.Location(max(lats), min(lons)), \
           ModestMaps.Geo.Location(min(lats), max(lons))

def decompose(provider, coord, tiffs, tiffs_northwest, tiffs_southeast):
    """
    """
    #filename = 'out/%(zoom)d-r%(row)d-c%(column)d.jpg' % coord.__dict__
    #output = PIL.Image.new('RGB', (256, 256), (0xFF, 0xFF, 0xFF))
    filename = 'out/%(zoom)d-r%(row)d-c%(column)d.png' % coord.__dict__
    output = PIL.Image.new('RGBA', (256, 256), (255, 255, 255, 0))
    
    # two locations based on coordinates
    northwest = ModestMaps.Microsoft.AerialProvider().coordinateLocation(coord)
    southeast = ModestMaps.Microsoft.AerialProvider().coordinateLocation(coord.down().right())

    intersects = southeast.lat <= tiffs_northwest.lat \
             and northwest.lat >= tiffs_southeast.lat \
             and northwest.lon <= tiffs_southeast.lon \
             and southeast.lon >= tiffs_northwest.lon
             
    if not intersects:
        return output

    if coord.zoom == max_zoom:
        print '-' * coord.zoom, filename
        
        for tiff in tiffs:
            intersects = southeast.lat <= tiff['northwest'].lat \
                     and northwest.lat >= tiff['southeast'].lat \
                     and northwest.lon <= tiff['southeast'].lon \
                     and southeast.lon >= tiff['northwest'].lon
    
            if intersects:
                # warp the image to a new TIFF file
                handle, warped_tiff = tempfile.mkstemp('.tif', 'warped-aerial-')
                warp = subprocess.Popen((gdalwarp, '-s_srs', '%s' % ' '.join(proj_in), '-t_srs', '%s' % ' '.join(proj_out), '-te', '%.15f' % northwest.lon, '%.15f' % southeast.lat, '%.15f' % southeast.lon, '%.15f' % northwest.lat, '-ts', '256', '256', tiff['file'], warped_tiff), stderr=subprocess.PIPE, stdout=subprocess.PIPE)
                warp.wait()
                os.close(handle)
    
                # make a PNG out of the TIFF so PIL doesn't bug out
                handle, warped_png = tempfile.mkstemp('.png', 'warped-aerial-')
                conv = subprocess.Popen((gdal_translate, '-of', 'PNG', warped_tiff, warped_png), stderr=subprocess.PIPE, stdout=subprocess.PIPE)
                conv.wait()
                os.close(handle)
                
                # paste the warped PNG onto our output
                warped_img = PIL.Image.open(warped_png)
                output.paste(warped_img, (0, 0), warped_img)
                del warped_img
                
                # remove temporary files
                os.remove(warped_tiff)
                os.remove(warped_png)
    
    else:
        topleft = decompose(provider, coord.zoomBy(1), tiffs, tiffs_northwest, tiffs_southeast).resize((128, 128), PIL.Image.ANTIALIAS)
        topright = decompose(provider, coord.zoomBy(1).right(), tiffs, tiffs_northwest, tiffs_southeast).resize((128, 128), PIL.Image.ANTIALIAS)
        bottomleft = decompose(provider, coord.zoomBy(1).down(), tiffs, tiffs_northwest, tiffs_southeast).resize((128, 128), PIL.Image.ANTIALIAS)
        bottomright = decompose(provider, coord.zoomBy(1).down().right(), tiffs, tiffs_northwest, tiffs_southeast).resize((128, 128), PIL.Image.ANTIALIAS)
        
        print ' ' * coord.zoom, filename
        
        output.paste(topleft, (0, 0))
        output.paste(topright, (128, 0))
        output.paste(bottomleft, (0, 128))
        output.paste(bottomright, (128, 128))

    #output.save(filename)
    
    alpha = output.split()[-1]
    
    if alpha.getextrema()!=(0,0):
      print "Not empty"
      mask = PIL.Image.eval(alpha, lambda a: 255 if a<128 else 0)
      im = output.convert('RGB').convert('P', palette=PIL.Image.ADAPTIVE, colors=255)
      # paste index 255 to the pixels in file where mask = 0
      im.paste(255, mask)
      #output.save(filename, "PNG", transparency=255, optimize=1)
      # transparency color index
      im.save(filename, "PNG", optimize=1, transparency=255)
    else:
      print "Empty"
    
    return output
    
        

if __name__ == '__main__':

    tiffs = []
    
    for tiff in sys.argv[1:]:
        tiff_northwest, tiff_southeast = image_bounds(tiff)
        tiffs.append({'file': tiff, 'northwest': tiff_northwest, 'southeast': tiff_southeast})

    northwest = ModestMaps.Geo.Location(max([tiff['northwest'].lat for tiff in tiffs]),
                                        min([tiff['northwest'].lon for tiff in tiffs]))
        
    southeast = ModestMaps.Geo.Location(min([tiff['southeast'].lat for tiff in tiffs]),
                                        max([tiff['southeast'].lon for tiff in tiffs]))
        
    print tiffs
    print northwest, southeast
    
    decompose(ModestMaps.Microsoft.AerialProvider(), ModestMaps.Core.Coordinate(0, 0, 0),
              tiffs, northwest, southeast)
