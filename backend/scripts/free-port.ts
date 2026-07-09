/**
 * Free the API listen port before `deno task dev` starts.
 *
 * VS Code / Cursor "Rerun Task" often leaves the previous `deno --watch`
 * child still bound to PORT, so the new watcher crashes with AddrInUse.
 */
const port = Number(Deno.env.get('PORT') ?? '3001');

const cmd = new Deno.Command('fuser', {
  args: ['-k', `${port}/tcp`],
  stdout: 'null',
  stderr: 'null',
});

const { code } = await cmd.output();
// 0 = killed something, 1 = nothing was listening — both are fine.
if (code === 0) {
  console.log(`Freed port ${port}`);
  // Give the kernel a beat to release the socket.
  await new Promise((r) => setTimeout(r, 200));
}
