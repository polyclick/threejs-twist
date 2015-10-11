'use strict';

function Application() {

  this.sceneWidth;
  this.sceneHeight;

  this.scene;
  this.camera;
  this.renderer;
  this.geometry;
  this.model;
  this.shader;

  this.params = {
    delta: 0
  };

  this.init();
};


Application.prototype = {
  init: function() {
    this.load(function(){
      this.createScene();
      this.addListeners();
    }.bind(this));
  },

  load: function(callback) {

    // some objects
    var objectNames = ['deer', 'bust', 'chair', 'walt'];
    var objectName = _.sample(objectNames);

    var loader = new THREE.CTMLoader();
    loader.load('objects/ctm/' + objectName + '.ctm', function(geometry) {
      this.geometry = geometry;
      if(callback)
        callback();
    }.bind(this));
  },

  createScene: function() {

    // calculate scene width/height
    this.sceneWidth = window.innerWidth;
    this.sceneHeight = window.innerHeight;



    // setup renderer
    this.renderer = new THREE.WebGLRenderer({alpha:true, antialias:true});
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.sceneWidth, this.sceneHeight);
    document.body.appendChild(this.renderer.domElement);



    // camera
    this.camera = new THREE.PerspectiveCamera(70, this.sceneWidth / this.sceneHeight, 1, 750);
    this.camera.position.z = 70;
    this.camera.position.y = 30;



    // scene
    this.scene = new THREE.Scene();



    // lights
    var ambient = new THREE.AmbientLight(0xffffff);
    this.scene.add(ambient);

    var pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.z = 650;
    pointLight.position.y = 300;
    pointLight.position.x = 650;
    this.scene.add(pointLight);



    // environement map skybox
    var path = 'images/';
    var format = '.jpg';
    var urls = [
      path + 'px' + format, path + 'nx' + format,
      path + 'py' + format, path + 'ny' + format,
      path + 'pz' + format, path + 'nz' + format
    ];

    var reflectionCube = THREE.ImageUtils.loadTextureCube(urls);
    reflectionCube.format = THREE.RGBFormat;



    // twist shader
    this.shader = ShaderFactory.createTwistShader();

    // first set all the uniforms as the shaderprogram would do
    this.shader.uniforms.diffuse.value = new THREE.Color(0xaaaaaa);
    this.shader.uniforms.envMap.value = reflectionCube;
    this.shader.uniforms.reflectivity.value = 0.3;
    this.shader.uniforms.twistTime.value = 0.0;
    this.shader.uniforms.twistHeight.value = 70.0;
    this.shader.uniforms.twistAngleDegMax.value = 360.0;



    // material
    //
    // create the material with the modified uniforms, vertex & fragment shader
    // don't forget to enable some extra props so that the correct uniforms get filled in
    var material = new THREE.ShaderMaterial({
      uniforms: this.shader.uniforms,
      vertexShader: this.shader.vertexShader,
      fragmentShader: this.shader.fragmentShader,
      lights:true,
      fog:false
    });

    // important to get an envmap working!
    material.envMap = true;


    // model
    this.model = new THREE.Mesh(this.geometry, material);
    this.model.position.y = -32;
    this.scene.add(this.model);


    // render & animation ticker
    TweenMax.ticker.fps(60);
    TweenMax.ticker.addEventListener( 'tick', this.tick.bind( this ) );
  },

  addListeners: function() {

    // resize
    window.addEventListener('resize', this.resize.bind(this), false);

    // mouse move
    $(window).mousemove(function(event){
      var delta = (-2 * event.pageX / $(window).width()) + 1;
      TweenMax.to(this.params, 0.25, { delta: delta });
    }.bind(this));
  },

  tick: function() {
    this.animate();
    this.render();
  },

  animate: function() {

    // change twist shader uniform so it can update
    this.shader.uniforms.twistTime.value = this.params.delta;

    // lookat
    this.camera.lookAt(this.scene.position);
  },

  render: function() {
    this.renderer.render(this.scene, this.camera);
  },

  resize: function() {

    // calculate scene width/height
    this.sceneWidth = window.innerWidth;
    this.sceneHeight = window.innerHeight;

    // update renderer
    this.renderer.setSize(this.sceneWidth, this.sceneHeight);

    // update camera
    this.camera.aspect = this.sceneWidth / this.sceneHeight;
    this.camera.updateProjectionMatrix();
  }
};








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
