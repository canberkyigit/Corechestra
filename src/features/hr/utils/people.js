/** Explicit HR allocations for the person, else derived from project membership (100% "Team member"). */
export function getAllocationsForPerson(person, projectAllocations, projects) {
  if (!person) return [];
  const explicit = (projectAllocations || []).filter((item) => item.userId === person.id);
  if (explicit.length > 0) return explicit;
  return (projects || [])
    .filter((project) => (
      (project.members || []).some((member) => member.userId === person.id)
      || (person.username && (project.memberUsernames || []).includes(person.username))
    ))
    .map((project) => ({
      id: `derived-${project.id}-${person.id}`,
      userId: person.id,
      projectId: project.id,
      allocation: 100,
      role: "Team member",
      derived: true,
    }));
}

export function dedupeById(list) {
  return [...new Map((list || []).filter((item) => item?.id).map((item) => [item.id, item])).values()];
}

export function findPersonForAuth(users, authUser) {
  if (!authUser) return null;
  const email = String(authUser.email || "").toLowerCase();
  return (users || []).find((user) => user.id === authUser.uid)
    || (email ? (users || []).find((user) => String(user.email || "").toLowerCase() === email) : null)
    || null;
}

export function personTitle(person) {
  return person?.title || person?.role || "Team Member";
}
