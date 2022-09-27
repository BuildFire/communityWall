const searchTableConfig = {
  options: {
    showDeleteButton: true
  },
  columns: [{
      header: "",
      data: "${data.userDetails.imageUrl != null ? data.userDetails.imageUrl : '../../../../../styles/media/avatar-placeholder.png'}",
      type: "Image",
      width: "50px",
      sortBy: "",
    },
    {
      header: "First Name",
      data: "${data.userDetails.displayName ? data.userDetails.displayName : (data.userDetails.firstName + ' ' + data.userDetails.lastName)}",
      type: "string",
      width: "162px",
    }
  ],
};