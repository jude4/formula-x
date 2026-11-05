"""Original triangle test geometry; never used as a vehicle or shipped as an asset."""
import os
import pathlib
import bpy
from mathutils import Euler
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
root = bpy.data.objects.new('fixture_root', None)
bpy.context.collection.objects.link(root)
root['fx_component_id'] = 'fixture.root'
root['fx_category'] = 'test-only'
root['fx_pivot_reviewed'] = True
mesh = bpy.data.meshes.new('fixture_triangle')
mesh.from_pydata([(0, 0, 0), (1, 0, 0), (0, 1, 0)], [], [(0, 1, 2)])
obj = bpy.data.objects.new('fixture_panel', mesh)
bpy.context.collection.objects.link(obj)
obj.parent = root
obj.location = (1, 2, 3)
obj.rotation_euler = Euler((0.1, 0.2, 0.3))
obj['fx_component_id'] = 'fixture.panel'
obj['fx_category'] = 'test-only'
obj['fx_pivot_reviewed'] = True
mesh.materials.append(bpy.data.materials.new('fixture_material'))
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.context.scene.unit_settings.scale_length = 1.0
bpy.ops.wm.save_as_mainfile(filepath=str(pathlib.Path(os.environ['FX_TEST_DIR']) / 'fixture.blend'))
