class Sandbox {
    constructor(infos) {
        const t = this

        // le marker
        t.pattern = infos.pattern
        t.id = infos.id

        t.cubes = infos.cubes

        // DOM
        t.$container = document.querySelector(".sandboxe-game__canvas")
        t.$header = document.querySelector(".sandboxe-game__header")
        t.$buttonEdit = document.querySelector(".sandboxe-game__button--edit")
        t.$buttonDelete = document.querySelector(".sandboxe-game__button--delete")
        t.$buttonAdd = document.querySelector(".sandboxe-game__button--add")

        // color picker
        t.$colors = document.querySelector("#colorPicker")
        t.$colorSlideInput = t.$colors.querySelector('.sandboxe-game__input')
        t.$colorResultContainer = t.$colors.querySelector(".sandboxe-game__result-container")
        t.$colorResult = t.$colors.querySelector(".sandboxe-game__result")
        t.$colorResult.style.opacity = 1

        // z picker
        t.$z = document.querySelector("#zPicker")
        t.$zInput = t.$z.querySelector('.sandboxe-game__input')
        t.$zResultContainer = t.$z.querySelector(".sandboxe-game__result-container")
        t.$zResult = t.$z.querySelector(".sandboxe-game__result")

        // variable urls
        THREEx.ArToolkitContext.baseURL = './assets/markers/'

        // taille de l'écran
        t.ww = window.innerWidth
        t.wh = window.innerWidth

        // loop des functions
        t.onRenderFcts = []

        // scene
        t.scene = new THREE.Scene()

        // flag
        window.isEdition = false
        window.isAdding = false

        // valeur du jeu
        t.gridSize = 3

        t.init()
    }

    init() {
        const t = this

        t.createRenderer()
        t.createLight()
        t.createCamera()
        t.createArToolKitSource()

        t.createVariables()
        t.bindEvents()

        t.initArToolKitSource()
        t.initMarker()
        t.initRenderer()

        t.renderCubes()
        t.animationFrame()
        t.updateMaxZ()
    }

    createRenderer() {
        const t = this

        // création éléments
        t.renderer = new THREE.WebGLRenderer({
            // antialias: true,
            alpha: true
        })

        t.renderer.shadowMap.type = THREE.PCFSoftShadowMap
        t.renderer.shadowMap.enabled = true

        // lui ajoute les propriétés
        t.renderer.setClearColor(new THREE.Color('lightgrey'), 0)
        t.renderer.setSize(t.ww, t.wh)
        t.renderer.domElement.classList.add("sandboxe-game__canvas")

        // ajoute au dom
        document.body.insertBefore(t.renderer.domElement, t.$header)
    }

    createCamera() {
        const t = this

        t.camera = new THREE.PerspectiveCamera(75, t.ww / t.wh, 0.1, 1000)
        t.scene.add(t.camera)
    }

    createLight() {
        const t = this

        t.ambient = new THREE.AmbientLight( 0x666666 )
        t.scene.add( t.ambient )

        // set la lumière qui va faire l'ombre
        t.directionalLight = new THREE.DirectionalLight( 'white' )
        t.directionalLight.position.set( 1, 2 , 0.3  ).setLength(2)
        t.directionalLight.shadow.mapSize.set(128,128)
        t.directionalLight.shadow.camera.bottom = - 0.6
        t.directionalLight.shadow.camera.top = 1 + 0.6 + 1
        t.directionalLight.shadow.camera.right = 1 + 0.6 + 1
        t.directionalLight.shadow.camera.left = -1 - 0.6 - 1
        t.directionalLight.castShadow = true

        // t.scene.add(new THREE.CameraHelper( t.directionalLight.shadow.camera )) // HELPER

        // ajoute à la scene
        t.scene.add( t.directionalLight )
    }

    createArToolKitSource() {
        const t = this

        t.arToolkitSource = new THREEx.ArToolkitSource({
            sourceType: 'webcam',
        })

        t.arToolkitSource.init(function onReady() {
            t.resize()
        })
    }

    createVariables() {
        const t = this

        // permet d'intéragir avec le DOM >>> est envoyé dans la class Cube
        t.domEvents = new THREEx.DomEvents(t.camera, t.renderer.domElement)

        // élements que l'on va passer dans notre class Cube
        t.three = {
            scene: t.scene,
            domEvents: t.domEvents
        }

        t.dom = {
            $colorSlideInput: t.$colorSlideInput
        }
    }

    bindEvents() {
        const t = this

        // resize
        document.addEventListener("resize", t.resize.bind(t))

        // change color
        t.$colorSlideInput.addEventListener("change", t.updateCubeColor.bind(t))

        // change l'alpha
        t.$colorResultContainer.addEventListener("click", t.updateAlphaCube.bind(t))

        // change z index
        t.$zInput.addEventListener("change", t.updateZ.bind(t))

        // edit button
        t.$buttonEdit.addEventListener("click", t.editMode.bind(t))
        t.$buttonAdd.addEventListener("click", t.addMode.bind(t))
        t.$buttonDelete.addEventListener("click", t.removeCube.bind(t))

        // mettre à jour le z
        window.addEventListener("updateMaxZ", t.updateMaxZ.bind(t))
    }

    resize() {
        const t = this

        // recalcule les valeurs de notre écran
        t.ww = window.innerWidth
        t.wh = window.innerHeight

        // gestion arToolKit
        t.arToolkitSource.onResizeElement()
        t.arToolkitSource.copyElementSizeTo(t.renderer.domElement)
        if (t.arToolkitContext.arController !== null) {
            t.arToolkitSource.copyElementSizeTo(t.arToolkitContext.arController.canvas)
        }
    }

    initArToolKitSource() {
        const t = this

        // créer un context
        t.arToolkitContext = new THREEx.ArToolkitContext({
            cameraParametersUrl: THREEx.ArToolkitContext.baseURL + 'camera_para.dat',
            detectionMode: 'mono',
        })

        // lance init
        t.arToolkitContext.init(function onCompleted() {
            t.camera.projectionMatrix.copy(t.arToolkitContext.getProjectionMatrix())
        })

        // ajoute la fonction au tableau qui stocke les fonctions pour le loop
        t.onRenderFcts.push(() => {
            if (t.arToolkitSource.ready === false) return
            t.arToolkitContext.update(t.arToolkitSource.domElement)

            t.scene.visible = t.camera.visible
        })
    }

    initMarker() {
        const t = this

        // ajoute le marker que l'on doit "voir" à notre grille
        new THREEx.ArMarkerControls(t.arToolkitContext, t.camera, {
            type: 'pattern',
            patternUrl: THREEx.ArToolkitContext.baseURL + t.pattern,
            changeMatrixMode: 'cameraTransformMatrix'
        })

        t.scene.visible = false

        // création d'un groupe d'éléments
        let grid = new THREE.Group()

        // ajoute à la scene
        t.scene.add(grid)

        // donne un nom au groupe pour le récupérer dans la scene
        grid.name = 'grid'
    }


    initRenderer() {
        const t = this

        // ajoute renderer au tableau d'update
        t.onRenderFcts.push(() => {
            t.renderer.render(t.scene, t.camera)
        })
    }

    animationFrame() {
        const t = this

        requestAnimationFrame(function animate(nowMsec) {

            // lance la boucle
            requestAnimationFrame(animate)

            // measure time
            t.lastTimeMsec = t.lastTimeMsec || nowMsec - 1000 / 60
            let deltaMsec = Math.min(200, nowMsec - t.lastTimeMsec)
            t.lastTimeMsec = nowMsec

            // appelle les function d'update que l'on vait stocké dans un tableau
            t.onRenderFcts.forEach((onRenderFct) => {
                onRenderFct(deltaMsec / 1000, nowMsec / 1000)
            })
        })
    }

    renderCubes() {
        const t = this

        // on créer les cubes
        for (let cube of t.cubes ) {

            // on append le cube
            new Cube(cube, t.three, t.dom)
        }

        // récupère notre grille dans notre scene
        let grid = t.scene.getObjectByName('grid')

        // ajoute BG transprent
        let material = new THREE.ShadowMaterial();
        material.opacity = 0.3
        let geometry = new THREE.PlaneGeometry(t.gridSize * t.gridSize, t.gridSize * t.gridSize)
        let planeMesh = new THREE.Mesh( geometry, material)
        planeMesh.receiveShadow = true
        planeMesh.depthWrite = false
        planeMesh.rotation.x = -Math.PI/2
        planeMesh.position.y = -1
        grid.add(planeMesh)

        // fixe la grille
        t.directionalLight.target = grid
    }

    updateMaxZ() {
        const t = this

        t.$zInput.setAttribute("max", maxZ)
        t.$zInput.value = maxZ
        t.updateZ()
    }

    updateCubeColor() {
        const t = this

        // random hsl pour générer les couleurs dans la palette Wes Anderson
        // let randomS = Math.random() * (80 - 50) + 50
        // let randomL = Math.random() * (100 - 50) + 50
        let randomS = 75
        let randomL = 65

        // change la couleur
        let cubeColor = 'hsl(' + t.$colorSlideInput.value + ', ' + randomS + '%, ' + randomL + '%)'
        t.$colorResult.style.backgroundColor = cubeColor

        // prépare l'event
        let event = new CustomEvent('changeColor',
            {
                detail: {
                    color: cubeColor,
                }
            })

        // trigger event de mise à jour de la couleur
        window.dispatchEvent(event)
    }

    updateAlphaCube() {
        const t = this

        // change l'alpha
        let alphaCube = Number(t.$colorResult.style.opacity) === 1 ? 0.5 : 1
        t.$colorResult.style.opacity = alphaCube
    
        // prépare l'event
        let event = new CustomEvent('changeColor',
            {
                detail: {
                    alpha: alphaCube,
                }
            })

        // trigger event de mise à jour de la couleur
        window.dispatchEvent(event)
    }

    updateZ() {
        const t = this

        // change la valeur dans notre texte
        t.$zResult.innerHTML = t.$zInput.value
        maxZ = Number(t.$zInput.value)

        // trigger changement visibilité des wireframes
        window.dispatchEvent( new CustomEvent("showWireframe") )
    }

    editMode() {
        const t = this

        // si active on revient au mode vue
        if (t.$buttonEdit.classList.contains('active')) {

            // changement des boutons
            t.$colors.classList.add('hidden')
            t.$buttonDelete.classList.add('hidden')
            t.$buttonAdd.classList.remove('not-active')

            // Mode edition à false -> dé-autoriser le click sur la grille
            window.isEdition = false

            // désélectionne tous les cubes
            window.dispatchEvent( new CustomEvent("cubeDeselected") )

            // reset alpha
            if (Number(t.$colorResult.style.opacity) === 0.5) t.$colorResult.style.opacity = 1
        } else {

            // changement des boutons
            t.$colors.classList.remove('hidden')
            t.$buttonDelete.classList.remove('hidden')
            t.$buttonAdd.classList.add('not-active')

            // trigger change pour setter la couleur dans le result petit timer pour l'alpha
            t.$colorSlideInput.dispatchEvent(new Event('change'))

            // Mode edition à true -> autoriser le click sur la grille
            window.isEdition = true
        }

        // met à jour la class
        t.$buttonEdit.classList.toggle('active')
    }

    addMode() {
        const t = this

        // si active on revient au mode vue
        if (t.$buttonAdd.classList.contains('active')) {

            // changement des boutons
            t.$z.classList.add('hidden')
            t.$buttonDelete.classList.add('hidden')
            t.$buttonEdit.classList.remove('not-active')

            // trigger pour cacher les cubes en wireframe
            window.dispatchEvent( new CustomEvent("hideWireframe") )

            // Mode adition à false -> dé-autoriser le click sur la grille
            window.isAddition = false

            // désélectionne tous les cubes
            window.dispatchEvent( new CustomEvent("cubeDeselected") )
        } else {

            // trigger change pour setter la couleur dans le result
            t.$zInput.dispatchEvent( new Event('change') )

            // trigger pour afficher les cubes en wireframe
            let eventShowWireframe = new CustomEvent("showWireframe")
            eventShowWireframe.zPosition = t.$zInput.value
            window.dispatchEvent( eventShowWireframe )

            // changement des boutons
            t.$z.classList.remove('hidden')
            t.$buttonEdit.classList.add('not-active')

            // Mode adition à true -> autoriser le click sur la grille
            window.isAddition = true
        }

        // met à jour la class
        t.$buttonAdd.classList.toggle('active')
    }

    removeCube() {
        let event = new CustomEvent('removeCube')

        // trigger event de suppression du cube
        window.dispatchEvent(event)
    }
}