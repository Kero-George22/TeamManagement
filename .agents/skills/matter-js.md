---
name: matter-js
description: 2D rigid body physics engine for the web. Includes minimal setup, rendering, mouse interaction, and SPA cleanup.
---

# Matter.js Skill

## Workflow
1. Confirm environment (plain HTML, React, or canvas-only) and rendering approach (`Matter.Render` for debug vs custom renderer).
2. Provide a minimal Engine/World/Render/Runner setup and add bodies.
3. Add interactions (mouse constraint) or constraints only if requested.
4. Share cleanup steps for SPA or teardown scenarios.

## Minimal Setup
```html
<script>
  const { Engine, Render, Runner, Bodies, Composite } = Matter;

  const engine = Engine.create();

  const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
      width: 800,
      height: 600,
      wireframes: false
    }
  });

  const runner = Runner.create();
  Runner.run(runner, engine);
  Render.run(render);

  const ground = Bodies.rectangle(400, 610, 810, 60, { isStatic: true });
  const box = Bodies.rectangle(400, 200, 80, 80);

  Composite.add(engine.world, [ground, box]);
</script>
```

## Common Patterns
*   Use `Composite.add(engine.world, [...])` to add bodies to the world.
*   Use `Render.create({ element, engine })` to create a canvas automatically, or pass a `canvas` you create yourself.
*   Set `render.options.wireframes = false` for solid rendering.
*   Use `Runner.run(runner, engine)` for a simple loop, or call `Engine.update` in your own loop if you need custom timing.

## Mouse Interaction (Optional)
```javascript
const { Mouse, MouseConstraint } = Matter;
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, { mouse });
Composite.add(engine.world, mouseConstraint);
render.mouse = mouse;
```

## Cleanup Checklist (SPA)
- [ ] Stop the runner with `Runner.stop(runner)`.
- [ ] Remove the render canvas from the DOM.
- [ ] Clear engine and world if needed.

## Questions to ask when specs are missing
1. What viewport size and scaling should the canvas use?
2. Are we using `Matter.Render` or a custom renderer?
3. Do you want mouse/touch drag interaction?
4. Should the simulation loop be paused when offscreen?