'use strict';

var ShaderFactory = {
  createTwistShader: function() {
    return {

      // Shader uniforms
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

      // Vertex shader part
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

      // Fragment shader part
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
  }
};
