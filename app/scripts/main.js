'use strict';

var clock = new THREE.Clock();

var scene, camera, renderer;
var geometry, uniforms, material, mesh;
var pointLight;
var loader;
var waltGeometry;
var model;

var ssss = {

    uniforms: THREE.UniformsUtils.merge( [

      THREE.UniformsLib[ "common" ],
      THREE.UniformsLib[ "fog" ],
      THREE.UniformsLib[ "lights" ],
      THREE.UniformsLib[ "shadowmap" ],

      {
        "emissive" : { type: "c", value: new THREE.Color( 0x000000 ) },
        "wrapRGB"  : { type: "v3", value: new THREE.Vector3( 1, 1, 1 ) },

        // add "twist deformer" uniforms
        "twistTime" : { type:"f", value:1.0 },
        "twistHeight" : { type:"f", value:1.0 },
        "twistAngleDegMax" : { type:"f", value:90.0 }
      }

    ] ),

    vertexShader: [

      "#define LAMBERT",

      "varying vec3 vLightFront;",

      "#ifdef DOUBLE_SIDED",

      " varying vec3 vLightBack;",

      "#endif",


      // twist uniforms
      "uniform float twistTime;",
      "uniform float twistHeight;",
      "uniform float twistAngleDegMax;",

      // twist util function
      "vec4 twist( vec4 pos, float t )",
      "{",
      "  float st = sin(t);",
      "  float ct = cos(t);",
      "  vec4 new_pos;",

      "  new_pos.x = pos.x * ct - pos.z * st;",
      "  new_pos.z = pos.x * st + pos.z * ct;",

      "  new_pos.y = pos.y;",
      "  new_pos.w = pos.w;",

      "  return( new_pos );",
      "}",


      THREE.ShaderChunk[ "common" ],
      THREE.ShaderChunk[ "map_pars_vertex" ],
      THREE.ShaderChunk[ "lightmap_pars_vertex" ],
      THREE.ShaderChunk[ "envmap_pars_vertex" ],
      THREE.ShaderChunk[ "lights_lambert_pars_vertex" ],
      THREE.ShaderChunk[ "color_pars_vertex" ],
      THREE.ShaderChunk[ "morphtarget_pars_vertex" ],
      THREE.ShaderChunk[ "skinning_pars_vertex" ],
      THREE.ShaderChunk[ "shadowmap_pars_vertex" ],
      THREE.ShaderChunk[ "logdepthbuf_pars_vertex" ],

      "void main() {",

        THREE.ShaderChunk[ "map_vertex" ],
        THREE.ShaderChunk[ "lightmap_vertex" ],
        THREE.ShaderChunk[ "color_vertex" ],

        THREE.ShaderChunk[ "morphnormal_vertex" ],
        THREE.ShaderChunk[ "skinbase_vertex" ],
        THREE.ShaderChunk[ "skinnormal_vertex" ],

        THREE.ShaderChunk[ "defaultnormal_vertex" ],
        THREE.ShaderChunk[ "morphtarget_vertex" ],
        THREE.ShaderChunk[ "skinning_vertex" ],

        // modify: THREE.ShaderChunk[ "default_vertex" ]
        // to add twist deformation to vertex position
        "#ifdef USE_SKINNING",
        "  vec4 mvPosition = modelViewMatrix * skinned;",
        "  #elif defined( USE_MORPHTARGETS )",
        "  vec4 mvPosition = modelViewMatrix * vec4( morphed, 1.0 );",
        "#else",

        // twist the final gl_Position via our mesh twist deformer function
        "  float angleDeg = twistAngleDegMax * sin(twistTime);",
        "  float angleRad = angleDeg * 3.14159 / 180.0;",
        "  float angle = (twistHeight * 0.5 + position.y) / twistHeight * angleRad;",
        "  vec4 twistedPosition = twist(vec4( position, 1.0 ), angle);",

        "  vec4 mvPosition = modelViewMatrix * twistedPosition;",

        // change normal to respect the twist
        "  vec4 twistedNormal = twist(vec4(objectNormal, 0.0), angle);",
        "  objectNormal = twistedNormal.xyz;",
        "  transformedNormal = normalMatrix * objectNormal;",
        "#endif",

        "gl_Position = projectionMatrix * mvPosition;",

        THREE.ShaderChunk[ "logdepthbuf_vertex" ],



        // modify: THREE.ShaderChunk[ "worldpos_vertex" ],
        // so twisted vertex position gets respected for env maps
        "#if defined( USE_ENVMAP ) || defined( PHONG ) || defined( LAMBERT ) || defined ( USE_SHADOWMAP )",
        "  #ifdef USE_SKINNING",
        "    vec4 worldPosition = modelMatrix * skinned;",
        "  #elif defined( USE_MORPHTARGETS )",
        "    vec4 worldPosition = modelMatrix * vec4( morphed, 1.0 );",
        "  #else",
        "    vec4 worldPosition = modelMatrix * twistedPosition;",
        "  #endif",
        "#endif",


        THREE.ShaderChunk[ "envmap_vertex" ],
        THREE.ShaderChunk[ "lights_lambert_vertex" ],
        THREE.ShaderChunk[ "shadowmap_vertex" ],

      "}"

    ].join("\n"),

    fragmentShader: [

      "uniform vec3 diffuse;",
      "uniform vec3 emissive;",
      "uniform float opacity;",

      "varying vec3 vLightFront;",

      "#ifdef DOUBLE_SIDED",

      " varying vec3 vLightBack;",

      "#endif",

      THREE.ShaderChunk[ "common" ],
      THREE.ShaderChunk[ "color_pars_fragment" ],
      THREE.ShaderChunk[ "map_pars_fragment" ],
      THREE.ShaderChunk[ "alphamap_pars_fragment" ],
      THREE.ShaderChunk[ "lightmap_pars_fragment" ],
      THREE.ShaderChunk[ "envmap_pars_fragment" ],
      THREE.ShaderChunk[ "fog_pars_fragment" ],
      THREE.ShaderChunk[ "shadowmap_pars_fragment" ],
      THREE.ShaderChunk[ "specularmap_pars_fragment" ],
      THREE.ShaderChunk[ "logdepthbuf_pars_fragment" ],

      "void main() {",

      " vec3 outgoingLight = vec3( 0.0 );", // outgoing light does not have an alpha, the surface does
      " vec4 diffuseColor = vec4( diffuse, opacity );",

        THREE.ShaderChunk[ "logdepthbuf_fragment" ],
        THREE.ShaderChunk[ "map_fragment" ],
        THREE.ShaderChunk[ "color_fragment" ],
        THREE.ShaderChunk[ "alphamap_fragment" ],
        THREE.ShaderChunk[ "alphatest_fragment" ],
        THREE.ShaderChunk[ "specularmap_fragment" ],

      " #ifdef DOUBLE_SIDED",

          //"float isFront = float( gl_FrontFacing );",
          //"gl_FragColor.xyz *= isFront * vLightFront + ( 1.0 - isFront ) * vLightBack;",

      "   if ( gl_FrontFacing )",
      "     outgoingLight += diffuseColor.rgb * vLightFront + emissive;",
      "   else",
      "     outgoingLight += diffuseColor.rgb * vLightBack + emissive;",

      " #else",

      "   outgoingLight += diffuseColor.rgb * vLightFront + emissive;",

      " #endif",

        THREE.ShaderChunk[ "lightmap_fragment" ],
        THREE.ShaderChunk[ "envmap_fragment" ],
        THREE.ShaderChunk[ "shadowmap_fragment" ],

        THREE.ShaderChunk[ "linear_to_gamma_fragment" ],

        THREE.ShaderChunk[ "fog_fragment" ],

      " gl_FragColor = vec4( outgoingLight, diffuseColor.a );", // TODO, this should be pre-multiplied to allow for bright highlights on very transparent objects

      "}"

    ].join("\n")

  };



function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 10000 );
  camera.position.z = 650;
  camera.position.y = 300;
  camera.position.x = 650;

  //geometry = new THREE.BoxGeometry( 500, 500, 500 );
  //geometry = new THREE.SphereGeometry( 250, 32, 32 );



  // LIGHTS

  var ambient = new THREE.AmbientLight( 0xffffff );
  scene.add( ambient );

  pointLight = new THREE.PointLight( 0xffffff, 1 );
  pointLight.position.z = 650;
  pointLight.position.y = 300;
  pointLight.position.x = 650;
  scene.add( pointLight );

  var path = "images/";
  var format = '.jpg';
  var urls = [
      path + 'px' + format, path + 'nx' + format,
      path + 'py' + format, path + 'ny' + format,
      path + 'pz' + format, path + 'nz' + format
    ];

  var reflectionCube = THREE.ImageUtils.loadTextureCube( urls );
  reflectionCube.format = THREE.RGBFormat;

  // This is the mesh lambert configuration we are going to manually make
  //var material = new THREE.MeshLambertMaterial( { color: 0xff6600, envMap: reflectionCube, combine: THREE.MixOperation, reflectivity: 0.3 } );
  //console.log(material);

  // first set all the uniforms as the shaderprogram would do
  ssss.uniforms.diffuse.value = new THREE.Color(0xaaaaaa);
  ssss.uniforms.envMap.value = reflectionCube;
  ssss.uniforms.reflectivity.value = 0.3;
  ssss.uniforms.twistTime.value = 0.0;
  ssss.uniforms.twistHeight.value = 70.0;
  ssss.uniforms.twistAngleDegMax.value = 360.0;
  console.log(ssss.uniforms);

  // create the material with the modified uniforms, vertex & fragment shader
  // don't forget to enable some extra props so that the correct uniforms get filled in
  material = new THREE.ShaderMaterial({
    uniforms: ssss.uniforms,
    vertexShader: ssss.vertexShader,
    fragmentShader: ssss.fragmentShader,
    lights:true,
    fog:false
  });

  // important to get an envmap working!
  material.envMap = true;


  //mesh = new THREE.Mesh( waltGeometry, material );
  //mesh.scale.x = mesh.scale.y = mesh.scale.z = 12;
  //mesh.rotation.y = 0.6;
  //scene.add( mesh );
  //console.log(model);
  //model.children[0].material = material;

  model.position.y = -550;
  model.scale.x = model.scale.y = model.scale.z = 15;

  model.traverse ( function (child) {
    if (child instanceof THREE.Mesh) {
      child.material = material;
      child.geometry.computeVertexNormals();
    }
  });

  scene.add( model );

  var helper = new THREE.BoundingBoxHelper(model, 0xff0000);
  helper.update();
  // If you want a visible bounding box
  //scene.add(helper);
  // If you just want the numbers
  console.log(helper.box.min);
  console.log(helper.box.max);

  renderer = new THREE.WebGLRenderer({alpha:true, antialias:true});
  renderer.setPixelRatio(window.devicePixelRatio ? window.devicePixelRatio : 1)
  renderer.setSize( window.innerWidth, window.innerHeight );

  document.body.appendChild( renderer.domElement );
}

function animate() {
  requestAnimationFrame( animate );

  //var timer = -0.0008 * Date.now();

  //pointLight.position.x = 250 + (500 * Math.sin( timer ));
  //pointLight.position.z = 2000;

  var delta = 5 * clock.getDelta();
  ssss.uniforms.twistTime.value += 0.2 * delta;

  camera.lookAt(scene.position);
  renderer.render( scene, camera );
}

function load() {
  // loader = new THREE.BinaryLoader( true );
  // loader.load(
  //   "obj/walt/WaltHead_bin.js",
  //   function( geometry ) {
  //     waltGeometry = geometry;

  //     init();
  //     animate();
  //   }
  // );

  var loader  = new THREEx.UniversalLoader();
  loader.load(['obj/bust/bust2.obj', 'obj/bust/bust2.mtl'], function(object3d){
    model = object3d;

    init();
    animate();
  })
}

load();




/*
<script type="x-shader/x-vertex" id="vertexshader">
  uniform float time;
  uniform float height;
  uniform float angleDegMax;

  vec4 twist( vec4 pos, float t )
  {
    float st = sin(t);
    float ct = cos(t);
    vec4 new_pos;

    new_pos.x = pos.x*ct - pos.z*st;
    new_pos.z = pos.x*st + pos.z*ct;

    new_pos.y = pos.y;
    new_pos.w = pos.w;

    return( new_pos );
  }

  void main() {
    float angleDeg = angleDegMax * sin(time);
    float angleRad = angleDeg * 3.14159 / 180.0;
    float angle = (height * 0.5 + position.y) / height * angleRad;
    vec4 twistedPosition = twist(vec4(position, 1.0), angle);

    gl_Position = projectionMatrix * modelViewMatrix * twistedPosition;
  }
</script>

<script type="x-shader/x-fragment" id="fragmentshader">
  void main() {
    gl_FragColor = vec4(1.0,  // R
                        0.0,  // G
                        1.0,  // B
                        1.0); // A
  }
</script>
*/