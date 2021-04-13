
const searchTableConfig ={
	options:{
		showEditButton:true
		,showDeleteButton:false
	}
	,columns:[
		{
			header:"Time/Date"
			,data:"${new Date(data.reportedAt).toLocaleDateString()}"
			,type:"date"
			,width:"120px"
			,sortBy: 'data.reportedAt'
		}
		,{
			header:"Reported"
			,data:"${data.reported}"
			,type:"string"
			,width:"150px"
			,sortBy: 'data.reported'
		}
		,{
			header:"Reporter"
			,data:"${data.reporter}"
			,type:"string"
			,width:"150px"
			,sortBy: 'data.reporter'
		}
		,{
			header:"Reported post"
			,data:"${data.text}"

			,type:"string"
			,width:"100px"
			,sortBy: 'data.text',
			command: 'showText'
		}
	]

};