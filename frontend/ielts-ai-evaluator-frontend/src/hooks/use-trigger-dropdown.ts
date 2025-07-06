import React from "react";
import { useState } from "react";

export function useDropdown() {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  return {
    isDropdownOpen,
    toggleDropdown,
  };
}
