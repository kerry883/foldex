import React, { useState, useMemo } from "react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { SidebarTrigger, useSidebar } from "@workspace/ui/components/sidebar";
import {
  VideoIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  Sidebar,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { usePublicVideos } from "@/hooks/use-videos";
import Videocard from "./videocard";
import { useNavigate } from "@tanstack/react-router";

const VIDEOS_PER_PAGE = 12;

const WatchList = () => {
     
  const {data:videos, isLoading:videosLoading} = usePublicVideos();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  // Filter videos based on search
  const filteredVideos = useMemo(() => {
    if (!videos) return [];
    if (!search.trim()) return videos;

    const searchLower = search.toLowerCase();
    return videos.filter((video) =>
      video.title?.toLowerCase().includes(searchLower)
    );
  }, [videos, search]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredVideos.length / VIDEOS_PER_PAGE);
  const startIndex = (currentPage - 1) * VIDEOS_PER_PAGE;
  const endIndex = startIndex + VIDEOS_PER_PAGE;
  const paginatedVideos = filteredVideos.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  // Loading state with skeleton matching the component layout
  if (videosLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto py-6 px-4">
          {/* Header Skeleton */}
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-10 w-10" />
          </div>

          {/* Search Skeleton */}
          <Skeleton className="h-12 w-full mb-6 rounded-lg" />

          {/* Stats Skeleton */}
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-5 w-32" />
          </div>

          {/* Video Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="bg-card text-card-foreground rounded-xl shadow-sm h-full overflow-hidden p-2"
              >
                <Skeleton className="w-full aspect-video rounded-xl " />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 px-4 ">
      {/* Header */}
      <div className="flex  mb-6  gap-2">
        <Sidebar className="h-10 w-10 cursor-pointer" onClick={toggleSidebar} />

        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">Video Library</h1>
          <p className="text-sm text-muted-foreground">
            Watch thousands of videos from the community to help you learn
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex bg-muted/50 items-center rounded-full border border-border/60 mb-4 p-2">
          <div className="flex items-center px-4 flex-1">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="border-none bg-transparent focus-visible:ring-0 shadow-none h-10"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          {search && (
            <p className="text-sm text-muted-foreground mt-2">
              Found {filteredVideos.length} video
              {filteredVideos.length !== 1 ? "s" : ""}
            </p>
          )}
          <p className="text-center text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredVideos.length)}{" "}
            of {filteredVideos.length} videos
          </p>
        </div>
      </div>

      {/* Content */}
      <div>
        {filteredVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <VideoIcon className="w-8 h-8 text-muted-foreground" />
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">
                {search ? "No Videos Found" : "No Videos Available"}
              </h2>
              <p className="text-muted-foreground max-w-md">
                {search
                  ? `No videos match "${search}". Try a different search term.`
                  : "No videos have been added to video vault yet."}
              </p>
            </div>

            {search && (
              <Button variant="outline" className="cursor-pointer" onClick={() => setSearch("")}>
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Video Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedVideos.map((video) => (
                <Videocard
                  key={video.id}
                  videoId={video.id}
                  onClick={() => {
                   navigate({to:"/watch/$watchId", params:{watchId:video.id}});
                  }}
                  allowed={false}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first page, last page, current page, and pages around current
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      );
                    })
                    .map((page, idx, arr) => {
                      // Add ellipsis between non-consecutive pages
                      const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && (
                            <span className="px-2 text-muted-foreground">
                              ...
                            </span>
                          )}
                          <Button
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="min-w-[40px]"
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="cursor-pointer"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchList;
