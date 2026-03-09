import { getMyJobs } from "@/actions/jobs";
import JobsList from "@/components/jobs/JobsList";

export default async function JobsPage() {
  const jobs = await getMyJobs();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Jobs</h1>
        <p className="text-gray-500 mt-1">
          Cards assigned to you across all boards
        </p>
      </div>
      <JobsList initialJobs={jobs} />
    </div>
  );
}
