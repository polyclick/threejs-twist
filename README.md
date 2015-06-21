# threejs-twist
Combining a custom twist morph vertex shader with the build-in threejs lambert shader.  
Mesh twister shader code from: http://www.ozone3d.net/tutorials/mesh_deformer_p3.php  
Demo on: http://polyclick.io/twist/

```
new_x = x * cos(angle) - z * sin(angle) 
new_y = y 
new_z = x * sin(angle) + z * cos(angle)
```

## previews
![alt tag](https://raw.github.com/polyclick/threejs-twist/master/readme-assets/walt-preview.png)
![alt tag](https://raw.github.com/polyclick/threejs-twist/master/readme-assets/bust-preview.png)

## how to run
```
npm install
bower install
gulp serve
```
