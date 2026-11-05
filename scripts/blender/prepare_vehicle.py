"""Non-destructive Blender vehicle preparation. Run with --background --python ... -- ARGS.
Never separates geometry by loose parts or invents components. Original author supplies meshes.
"""
import argparse
import json
import math
import pathlib
import sys
import bpy


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True)
    parser.add_argument('--report', required=True)
    parser.add_argument('--output')
    parser.add_argument('--license-record')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    source = pathlib.Path(args.source).resolve()
    report = pathlib.Path(args.report).resolve()
    output = pathlib.Path(args.output).resolve() if args.output else None
    if not source.is_file():
        raise ValueError('Source file does not exist')
    if output == source or report == source or output == report:
        raise ValueError('Source, output and report must be different files')
    if output and output.exists():
        raise ValueError('Refusing to overwrite an existing export')
    if report.exists():
        raise ValueError('Refusing to overwrite an existing report')
    if source.suffix.lower() == '.blend':
        bpy.ops.wm.open_mainfile(filepath=str(source))
    elif source.suffix.lower() in ('.glb', '.gltf'):
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete(use_global=False)
        bpy.ops.import_scene.gltf(filepath=str(source))
    else:
        raise ValueError('Use an authored .blend, .gltf or .glb source')
    issues = []
    ids = set()
    components = []
    for obj in sorted(bpy.context.scene.objects, key=lambda o: o.name):
        if obj.type not in ('MESH', 'EMPTY'):
            continue
        component_id = obj.get('fx_component_id')
        if not component_id:
            issues.append(f'{obj.name}: missing fx_component_id')
        elif component_id in ids:
            issues.append(f'{obj.name}: duplicate fx_component_id')
        ids.add(component_id)
        if obj.type == 'MESH' and len(obj.data.polygons) == 0:
            issues.append(f'{obj.name}: empty mesh')
        if not obj.get('fx_category'):
            issues.append(f'{obj.name}: missing fx_category')
        if not obj.get('fx_pivot_reviewed', False):
            issues.append(f'{obj.name}: pivot not artist-reviewed')
        if obj.type == 'MESH' and (not obj.data.materials or any(m is None for m in obj.data.materials)):
            issues.append(f'{obj.name}: missing material')
        if not all(math.isfinite(value) for row in obj.matrix_local for value in row):
            issues.append(f'{obj.name}: non-finite transform')
        components.append({
            'name': obj.name, 'id': component_id, 'type': obj.type,
            'parent': obj.parent.name if obj.parent else None,
            'local_matrix_blender_z_up': [list(row) for row in obj.matrix_local],
            'source_pivot_world_blender_z_up': list(obj.matrix_world.translation),
            'materials': [m.name if m else None for m in obj.data.materials] if obj.type == 'MESH' else [],
            'vertices': len(obj.data.vertices) if obj.type == 'MESH' else 0,
            'polygons': len(obj.data.polygons) if obj.type == 'MESH' else 0,
        })
    if not components:
        issues.append('No mesh or empty objects found')
    if bpy.context.scene.unit_settings.scale_length != 1.0:
        issues.append('Scene unit scale must be 1.0 metres; rescale in authoring, not automatically')
    license_record = None
    if args.license_record:
        license_record = json.loads(pathlib.Path(args.license_record).read_text())
        if not all(license_record.get(key) for key in ('asset', 'creator', 'license', 'source', 'verified_by')):
            issues.append('Incomplete license record')
    elif output:
        issues.append('Export requires a verified license record')
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps({'source': str(source), 'blender_version': bpy.app.version_string,
        'coordinate_system': 'Blender Z-up; exporter converts to glTF Y-up',
        'issues': issues, 'components': components, 'license': license_record,
        'note': 'Passing these structural checks does not certify completeness, realism or legal clearance.'}, indent=2) + '\n')
    if output:
        if issues:
            raise ValueError(f'Export blocked by {len(issues)} preparation issues; see report')
        output.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', export_extras=True,
            export_yup=True, export_apply=False, export_animations=False)
        print('Exported:', output)
    print(f'Audited {len(components)} objects; {len(issues)} preparation issues. Report: {report}')


if __name__ == '__main__':
    main()
